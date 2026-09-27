import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { buildCopilotContext, generateCopilotEvents, eventEngine } from "@/lib/copilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const testCopilotSchema = z.object({
  windowSize: z.number().int().min(1).max(10).optional(),
});

/**
 * Endpoint interno para testes e validação da Fase 1 do Copilot 2.0.
 * Protegido estritamente pelo cookie auth_token do terapeuta logado.
 * Isolamento garantido por therapist_id e session_id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const therapistId = getTherapistIdFromRequest(req);
    const { id } = await params;
    const sessionId = z.string().min(1).parse(id);

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body vazio é aceito (usa defaults)
    }

    const parsed = testCopilotSchema.safeParse(body);
    const windowSize = parsed.success ? parsed.data.windowSize : undefined;

    // 1. Monta contexto completo com ContextEngine
    const context = await buildCopilotContext({
      sessionId,
      therapistId,
      windowSize,
    });

    if (context.recentChunks.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum trecho de transcrição encontrado para esta sessão.",
          sessionId,
        },
        { status: 400 }
      );
    }

    // 2. Avaliação heurística do EventEngine
    const evaluation = eventEngine.evaluateContext(context);

    // 3. Execução do CopilotEngine
    const events = await generateCopilotEvents(context);

    return NextResponse.json(
      {
        status: "success",
        meta: {
          sessionId: context.sessionId,
          therapistId: context.therapistId,
          patientName: context.patient?.name ?? null,
          hasAnamnesis: Boolean(context.patient?.anamnesis),
          hasMemorySummary: Boolean(context.patient?.memorySummary),
          totalChunksCount: context.totalChunksCount,
          recentChunksEvaluated: context.recentChunks.length,
          evaluation,
        },
        events,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const isAuth =
      typeof (error as { code?: unknown }).code === "string" &&
      ["UNAUTHENTICATED", "INVALID_TOKEN"].includes(
        (error as { code: string }).code
      );

    return NextResponse.json(
      { error: isAuth ? "Não autenticado" : message },
      { status: isAuth ? 401 : 500 }
    );
  }
}
