import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateInsightsFromTranscript } from "@/lib/ai/generateInsights";
import { getOrCreateTherapistId } from "@/lib/db/therapist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const { package: pkg, fallbackReason } = await generateInsightsFromTranscript({
      chunks,
    });

    if (fallbackReason) {
      const therapistId = await getOrCreateTherapistId({ displayName: "Dra. Cristiane" });
      await logAiFallback({
        req,
        therapistId,
        sessionId,
        reason: fallbackReason,
      });
    }

    const title = `Suporte IA - ${new Date().toISOString().slice(0, 10)}`;
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
