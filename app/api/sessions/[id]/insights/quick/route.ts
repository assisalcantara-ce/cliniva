import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateQuickInsights } from "@/lib/ai/generateQuickInsights";
import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory } from "@/lib/db/patientMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json(
      { error: code === "UNAUTHENTICATED" ? "Não autenticado" : "Token inválido" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const sessionId = z.string().min(1).parse(id);

  try {
    const supabase = createSupabaseAdminClient();

    // 1. Verifica se a sessão existe e pertence ao terapeuta autenticado
    const sessionResult = await supabase
      .from("sessions")
      .select("id, patient_id, therapist_id")
      .eq("id", sessionId)
      .eq("therapist_id", therapistId)
      .maybeSingle();

    if (sessionResult.error) {
      return NextResponse.json({ error: sessionResult.error.message }, { status: 500 });
    }

    if (!sessionResult.data) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const chunksResult = await supabase
      .from("transcript_chunks")
      .select("id, text, speaker")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (chunksResult.error) {
      return NextResponse.json({ error: chunksResult.error.message }, { status: 500 });
    }

    const chunkRowSchema = z.object({
      id: z.string().min(1),
      speaker: z.string().nullable().optional(),
      text: z.string().optional(),
    });

    const chunks = (chunksResult.data ?? []).map((raw) => {
      const parsed = chunkRowSchema.parse(raw);
      return { id: parsed.id, speaker: parsed.speaker, text: parsed.text ?? "" };
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Sessão sem transcrição." },
        { status: 400 },
      );
    }

    const patientId: string | null =
      sessionResult.data && typeof sessionResult.data.patient_id === "string"
        ? sessionResult.data.patient_id
        : null;

    const memoryRow = patientId
      ? await getPatientMemory({ patientId, therapistId })
      : null;

    const patientMemory = memoryRow?.summary ?? undefined;

    const result = await generateQuickInsights({ chunks, therapistId, patientMemory });

    return NextResponse.json(
      { package: result.package, mode: result.mode, provider: result.provider },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAuth =
      typeof (error as { code?: unknown }).code === "string" &&
      ["UNAUTHENTICATED", "INVALID_TOKEN"].includes(
        (error as { code: string }).code,
      );
    return NextResponse.json(
      { error: isAuth ? "Não autenticado" : message },
      { status: isAuth ? 401 : 500 },
    );
  }
}
