import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";

import { verifySessionToken } from "@/lib/ai/chatToken";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTherapist } from "@/lib/publicTherapist";
import { applyCors, handleOptionsCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  slug: z.string().trim().min(2).max(100),
  sessionId: z.string().uuid("sessionId deve ser um UUID válido."),
});

export async function OPTIONS(req: NextRequest) {
  return handleOptionsCors(req);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP (60 leituras por minuto)
    const clientIp =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";

    const rate = checkRateLimit(`chat_session:${clientIp}`, {
      limit: 60,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.resetInMs / 1000)));
      return applyCors(response, req);
    }

    // 2. Validação dos Parâmetros de Busca
    const url = new URL(req.url);
    const parseResult = querySchema.safeParse({
      slug: url.searchParams.get("slug"),
      sessionId: url.searchParams.get("sessionId"),
    });

    if (!parseResult.success) {
      const response = NextResponse.json(
        { error: "Parâmetros inválidos.", details: parseResult.error.flatten() },
        { status: 400 }
      );
      return applyCors(response, req);
    }

    const { slug, sessionId } = parseResult.data;

    // 3. Resolução Segura do Terapeuta
    const therapist = await resolvePublicTherapist(slug);
    if (!therapist || !therapist.isActive) {
      const response = NextResponse.json(
        { error: "Terapeuta não encontrado ou inativo." },
        { status: 404 }
      );
      return applyCors(response, req);
    }

    const supabase = createSupabaseAdminClient();

    // 4. Validação da Credencial de Sessão (Token Opaco Assinado ou ip_hash)
    const sessionToken = url.searchParams.get("token") || req.headers.get("x-session-token");
    const verifiedIdFromToken = sessionToken ? verifySessionToken(sessionToken) : null;

    const ipHash = createHash("sha256")
      .update(`${clientIp}-${new Date().toISOString().slice(0, 10)}`)
      .digest("hex");

    const { data: session, error } = await supabase
      .from("landing_chat_sessions")
      .select("id, status, messages, message_count, max_messages, expires_at, ip_hash")
      .eq("id", sessionId)
      .eq("therapist_id", therapist.id)
      .maybeSingle();

    // Autoriza se o token assinado for válido para este sessionId OU se o ip_hash bater
    const isTokenAuthorized = verifiedIdFromToken === sessionId;
    const isIpAuthorized = session && session.ip_hash === ipHash;

    if (error || !session || (!isTokenAuthorized && !isIpAuthorized)) {
      const response = NextResponse.json(
        { error: "Sessão não encontrada ou acesso não autorizado." },
        { status: 404 }
      );
      return applyCors(response, req);
    }

    const isExpired = new Date(session.expires_at).getTime() < Date.now();
    const effectiveStatus = isExpired ? "expired" : session.status;

    // 5. Busca da Proposta Ativa Mais Recente da Sessão (se houver)
    let activeProposal = null;
    if (effectiveStatus === "active") {
      const { data: prop } = await supabase
        .from("landing_chat_proposals")
        .select("id, scheduled_start, scheduled_end, patient_name, patient_whatsapp, patient_notes, expires_at, status")
        .eq("session_id", sessionId)
        .eq("therapist_id", therapist.id)
        .eq("status", "proposed")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prop) {
        activeProposal = {
          proposalId: prop.id,
          fullName: prop.patient_name,
          whatsapp: prop.patient_whatsapp,
          scheduledStart: prop.scheduled_start,
          scheduledEnd: prop.scheduled_end,
          notes: prop.patient_notes,
          expiresAt: prop.expires_at,
        };
      }
    }

    const response = NextResponse.json(
      {
        sessionId: session.id,
        status: effectiveStatus,
        messages: Array.isArray(session.messages) ? session.messages : [],
        activeProposal,
        remainingMessages: Math.max(0, session.max_messages - session.message_count),
      },
      { status: 200 }
    );

    return applyCors(response, req);
  } catch (error: any) {
    console.error("[GET /api/public/chat/session] Erro:", error);
    const response = NextResponse.json(
      { error: "Erro ao recuperar sessão de atendimento." },
      { status: 500 }
    );
    return applyCors(response, req);
  }
}
