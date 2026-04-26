import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateInsightsFromTranscript } from "@/lib/ai/generateInsights";
import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory, upsertPatientMemory } from "@/lib/db/patientMemory";
import { buildUpdatedPatientMemory } from "@/lib/ai/updatePatientMemory";
import { getTherapistOpenAiKey } from "@/lib/db/therapist";

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
  const { id } = await params;
  const sessionId = z.string().min(1).parse(id);
  try {
    const supabase = createSupabaseAdminClient();

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
        { error: "Sessão sem transcrição. Adicione chunks antes de gerar IA." },
        { status: 400 },
      );
    }

    const therapistId = getTherapistIdFromRequest(req);

    // Busca patient_id da sessão para ler/atualizar memória clínica
    const sessionResult = await supabase
      .from("sessions")
      .select("patient_id")
      .eq("id", sessionId)
      .maybeSingle();

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

    // Atualiza memória clínica do paciente em background (não-bloqueante)
    // Apenas quando a IA rodou com qualidade (OpenAI ou Groq), não mock
    if (patientId && provider !== "mock") {
      const { apiKey } = await getTherapistOpenAiKey({ therapistId }).catch(() => ({ apiKey: undefined }));
      buildUpdatedPatientMemory({
        previous: patientMemory ?? "",
        newInsights: pkg,
        apiKey,
      })
        .then((newSummary) => {
          if (newSummary) {
            return upsertPatientMemory({ patientId: patientId!, therapistId, summary: newSummary });
          }
        })
        .catch((err: unknown) => {
          console.error("[generate] updatePatientMemory error:", err instanceof Error ? err.message : err);
        });
    }

    return NextResponse.json(
      {
        package: pkg,
        insights: insertResult.data ?? [],
        provider,
        isFullAI,
        patientMemory: patientMemory ?? null,
        fallback: fallbackReason ? { used: true, reason: fallbackReason } : { used: false },
      },
      { status: 200 },
    );
  } catch (error) {
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
