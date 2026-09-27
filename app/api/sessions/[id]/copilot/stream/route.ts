import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { realtimeEventBroker } from "@/lib/copilot/realtime/broker/eventBroker";
import type { SSEEvent } from "@/lib/copilot/realtime/broker/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Endpoint de Server-Sent Events (SSE) para transmissão ao vivo de eventos do Copilot.
 * 
 * Rota: GET /api/sessions/[id]/copilot/stream
 * 
 * Garantias de Segurança e Funcionamento:
 * 1. Autenticação estrita do terapeuta via cookie auth_token / parseAuthToken.
 * 2. Validação de Autorização: verifica no banco que a sessão pertence ao terapeuta autenticado.
 * 3. Assinatura live-only no RealtimeEventBroker sem retenção de histórico em memória.
 * 4. Heartbeat periódico a cada 15s para manter a conexão ativa e detectar desconexões mortas.
 * 5. Cleanup garantido no abort do request (req.signal.onabort).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let therapistId: string;
  try {
    therapistId = getTherapistIdFromRequest(req);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "UNAUTHENTICATED";
    const { error, status } = authError(code);
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;
  const parsedSessionId = z.string().min(1).safeParse(id);
  if (!parsedSessionId.success) {
    return NextResponse.json({ error: "sessionId inválido" }, { status: 400 });
  }
  const sessionId = parsedSessionId.data;

  // 1. Validação de Propriedade da Sessão (therapist_id deve conferir com o usuário autenticado)
  try {
    const supabase = createSupabaseAdminClient();
    const sessionQuery = await supabase
      .from("sessions")
      .select("id, therapist_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionQuery.error) {
      return NextResponse.json(
        { error: "Erro ao verificar sessão." },
        { status: 500 }
      );
    }

    if (!sessionQuery.data) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (sessionQuery.data.therapist_id !== therapistId) {
      return NextResponse.json(
        { error: "Acesso negado: a sessão não pertence ao terapeuta autenticado." },
        { status: 403 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Falha na verificação de autorização: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // 2. Criação do Stream SSE com ReadableStream
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (eventData: SSEEvent) => {
        try {
          const payload = `event: ${eventData.type}\ndata: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Erro ao enviar (stream fechado)
        }
      };

      // Inscrição no broker apenas para a sessão autorizada
      unsubscribe = realtimeEventBroker.subscribe(sessionId, (event) => {
        sendEvent(event);
      });

      // 3. Envia evento inicial connection_ready
      sendEvent({
        type: "connection_ready",
        sessionId,
        therapistId,
        timestamp: Date.now(),
        message: "Conexão SSE estabelecida com sucesso.",
      });

      // 4. Inicia Heartbeat periódico
      heartbeatTimer = setInterval(() => {
        sendEvent({
          type: "heartbeat",
          timestamp: Date.now(),
        });
      }, HEARTBEAT_INTERVAL_MS);

      // 5. Cleanup imediato caso o cliente encerre a conexão
      req.signal.addEventListener("abort", () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // Já fechado
        }
      });
    },
    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Desativa buffering no Nginx / proxy
    },
  });
}
