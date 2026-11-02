import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateInsightsFromTranscript } from "@/lib/ai/generateInsights";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory } from "@/lib/db/patientMemory";
import { getTherapistEntitlements } from "@/lib/plans/entitlements";
import { reserveCorporateAiQuota, refundCorporateAiQuota } from "@/lib/plans/quotas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function logAiFallback(params: {
  req: NextRequest;
  therapistId: string;
  sessionId: string;
  reason: string;
}) {
  const supabase = createSupabaseAdminClient();
  const userResult = await supabase
    .from("users")
    .select("id")
    .eq("therapist_id", params.therapistId)
    .limit(1)
    .maybeSingle();

  if (userResult.error || !userResult.data?.id) return;

  const forwardedFor = params.req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const userAgent = params.req.headers.get("user-agent");

  await supabase.from("user_audits").insert({
    user_id: userResult.data.id,
    action: "ai_fallback",
    ip_address: ipAddress,
    user_agent: userAgent,
    details: { reason: params.reason, session_id: params.sessionId },
    timestamp: new Date().toISOString(),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
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
  const sessionId = z.string().min(1).parse(id);

  try {
    // 1. Verificação Estrita de Direitos do Plano (Entitlements)
    const entitlement = await getTherapistEntitlements(therapistId);

    if (entitlement.status === "trial_expired") {
      return NextResponse.json(
        {
          error: "Seu período de teste gratuito de 7 dias expirou. Faça upgrade de plano para gerar novas análises de IA.",
          code: "TRIAL_EXPIRED",
        },
        { status: 403 },
      );
    }

    if (entitlement.status === "cancelled" || entitlement.status === "inactive") {
      return NextResponse.json(
        {
          error: "Sua assinatura não está ativa. Ative seu plano para utilizar os recursos de inteligência artificial.",
          code: "SUBSCRIPTION_INACTIVE",
        },
        { status: 403 },
      );
    }

    // 2. Reserva Atômica ANTECIPADA da Franquia de IA Corporativa ANTES da OpenAI
    // Garante que requisições concorrentes não ultrapassem o limite contratado
    const quotaReservation = await reserveCorporateAiQuota({ therapistId, entitlement });
    if (!quotaReservation.allowed) {
      return NextResponse.json(
        {
          error: quotaReservation.error ?? "Limite de análises da IA Corporativa atingido.",
          code: "QUOTA_EXCEEDED",
          currentUsage: quotaReservation.currentUsage,
          maxAllowed: quotaReservation.maxAllowed,
          period: quotaReservation.period,
        },
        { status: 429 },
      );
    }

    const supabase = createSupabaseAdminClient();

    // 3. Verifica se a sessão existe e pertence ao terapeuta autenticado
    const sessionResult = await supabase
      .from("sessions")
      .select("id, patient_id, therapist_id")
      .eq("id", sessionId)
      .eq("therapist_id", therapistId)
      .maybeSingle();

    if (sessionResult.error) {
      return NextResponse.json(
        { error: sessionResult.error.message },
        { status: 500 },
      );
    }

    if (!sessionResult.data) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    const chunksResult = await supabase
      .from("transcript_chunks")
      .select("id, session_id, text, speaker, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (chunksResult.error) {
      return NextResponse.json(
        { error: chunksResult.error.message },
        { status: 500 },
      );
    }

    const chunkRowSchema = z.object({
      id: z.string().min(1),
      speaker: z.string().nullable().optional(),
      text: z.string().optional(),
    });

    const chunks = (chunksResult.data ?? []).map((raw) => {
      const parsed = chunkRowSchema.parse(raw);
      return {
        id: parsed.id,
        speaker: parsed.speaker,
        text: parsed.text ?? "",
      };
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Sessão sem anotações ou transcrição. Adicione notas antes de gerar IA." },
        { status: 400 },
      );
    }

    const patientId: string | null =
      sessionResult.data && typeof sessionResult.data.patient_id === "string"
        ? sessionResult.data.patient_id
        : null;

    // Lê memória clínica anterior (não-bloqueante)
    const memoryRow = patientId
      ? await getPatientMemory({ patientId, therapistId })
      : null;
    const patientMemory = memoryRow?.summary ?? undefined;

    const { package: pkg, fallbackReason, provider, isFullAI } = await generateInsightsFromTranscript({
      chunks,
      therapistId,
      patientMemory,
    });

    if (fallbackReason) {
      await logAiFallback({
        req,
        therapistId,
        sessionId,
        reason: fallbackReason,
      });
    }

    const title = `Suporte IA - ${new Date().toISOString().slice(0, 10)}`;

    // Arquiva análise anterior antes de inserir a nova (preserva histórico)
    await supabase
      .from("session_insights")
      .update({ archived_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .is("archived_at", null);

    const rows = [
      { kind: "themes", content_json: { themes: pkg.themes } },
      { kind: "questions", content_json: { questions: pkg.questions } },
      { kind: "hypotheses", content_json: { hypotheses: pkg.hypotheses } },
      { kind: "risks", content_json: { risks: pkg.risks } },
      { kind: "summary", content_json: { summary: pkg.summary } },
      { kind: "next_steps", content_json: { next_steps: pkg.next_steps } },
    ].map((r) => ({
      session_id: sessionId,
      kind: r.kind,
      title,
      content_json: r.content_json,
      evidence_json: [],
    }));

    const insertResult = await supabase
      .from("session_insights")
      .insert(rows)
      .select("id, session_id, kind, title, content_json, evidence_json, created_at");

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        package: pkg,
        insights: insertResult.data ?? [],
        provider,
        isFullAI,
        patientMemory: patientMemory ?? null,
        fallback: fallbackReason ? { used: true, reason: fallbackReason } : { used: false },
        quota: {
          currentUsage: quotaReservation.currentUsage,
          maxAllowed: quotaReservation.maxAllowed,
          period: quotaReservation.period,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // Estorno atômico em caso de falha crítica na OpenAI ou no banco de dados
    await refundCorporateAiQuota({ therapistId, entitlement: (await getTherapistEntitlements(therapistId).catch(() => null)) as any }).catch(() => {});

    const message = error instanceof Error ? error.message : "Unknown error";
    const isOpenAI = message.startsWith("OpenAI") || message.includes("OpenAI");
    const isAIModeration =
      message.toLowerCase().includes("moderation") ||
      message.toLowerCase().includes("ai returned") ||
      message.toLowerCase().includes("ai output");
    const isRateLimited =
      message.toLowerCase().includes("too many requests") ||
      message.includes("OpenAI (429)");
    const status = isRateLimited ? 429 : isOpenAI || isAIModeration ? 502 : 500;

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json(
      {
        error: isRateLimited
          ? "Limite temporário da OpenAI (muitas requisições). Aguarde um pouco e tente novamente."
          : "Falha ao gerar suporte (IA). Tente novamente.",
        detail: isDev ? message : undefined,
      },
      { status },
    );
  }
}
