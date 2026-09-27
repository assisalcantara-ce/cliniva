import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistIdFromRequest } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPatientMemory, upsertPatientMemory } from "@/lib/db/patientMemory";
import {
  buildUpdatedPatientMemory,
  type PatientMemoryInsightsInput,
} from "@/lib/ai/updatePatientMemory";
import { getTherapistOpenAiKey } from "@/lib/db/therapist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const sessionId = z.string().min(1).parse(id);

  try {
    const therapistId = getTherapistIdFromRequest(req);
    const supabase = createSupabaseAdminClient();

    // 1. Busca sessão e valida isolamento por therapist_id
    const sessionResult = await supabase
      .from("sessions")
      .select("id, patient_id, therapist_id")
      .eq("id", sessionId)
      .eq("therapist_id", therapistId)
      .maybeSingle();

    if (sessionResult.error) {
      return NextResponse.json(
        { error: sessionResult.error.message },
        { status: 500 }
      );
    }

    if (!sessionResult.data) {
      return NextResponse.json(
        { error: "Sessão não encontrada ou não autorizada." },
        { status: 404 }
      );
    }

    const patientId: string | null = sessionResult.data.patient_id ?? null;
    if (!patientId) {
      return NextResponse.json(
        { success: true, consolidated: false, reason: "Sessão sem paciente vinculado." },
        { status: 200 }
      );
    }

    // 2. Busca somente os insights ativos (não arquivados) da sessão
    const insightsResult = await supabase
      .from("session_insights")
      .select("kind, content_json, archived_at")
      .eq("session_id", sessionId)
      .is("archived_at", null);

    if (insightsResult.error) {
      return NextResponse.json(
        { error: insightsResult.error.message },
        { status: 500 }
      );
    }

    const rawRows = Array.isArray(insightsResult.data) ? insightsResult.data : [];

    let summaryBullets: string[] = [];
    const themesList: Array<{ title: string; description: string }> = [];

    for (const row of rawRows) {
      const content =
        typeof row.content_json === "object" && row.content_json !== null
          ? (row.content_json as Record<string, unknown>)
          : {};

      if (row.kind === "summary") {
        const sumObj =
          typeof content.summary === "object" && content.summary !== null
            ? (content.summary as { bullets?: unknown })
            : (content as { bullets?: unknown });
        if (Array.isArray(sumObj.bullets)) {
          summaryBullets = sumObj.bullets.filter(
            (b): b is string => typeof b === "string" && b.trim().length > 0
          );
        }
      }

      if (row.kind === "themes") {
        if (Array.isArray(content.themes)) {
          for (const t of content.themes) {
            if (typeof t === "object" && t !== null) {
              const tObj = t as { title?: unknown; description?: unknown };
              const title = typeof tObj.title === "string" ? tObj.title.trim() : "";
              const description =
                typeof tObj.description === "string" ? tObj.description.trim() : "";
              if (title.length > 0) {
                themesList.push({ title, description });
              }
            }
          }
        }
      }
    }

    // Se não há resumo nem temas ativos gerados, encerra sem alterar memória
    if (summaryBullets.length === 0 && themesList.length === 0) {
      return NextResponse.json(
        { success: true, consolidated: false, reason: "Nenhum resumo ou tema ativo para consolidar." },
        { status: 200 }
      );
    }

    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: summaryBullets },
      themes: themesList,
    };

    // 3. Busca memória anterior e chave da OpenAI
    const memoryRow = await getPatientMemory({ patientId, therapistId });
    const previousMemory = memoryRow?.summary ?? "";

    const { apiKey } = await getTherapistOpenAiKey({ therapistId }).catch(() => ({
      apiKey: undefined,
    }));

    // 4. Executa merge longitudinal de IA apenas com summary + themes
    const updatedSummary = await buildUpdatedPatientMemory({
      previous: previousMemory,
      newInsights: memoryInput,
      apiKey,
    });

    if (updatedSummary) {
      await upsertPatientMemory({
        patientId,
        therapistId,
        summary: updatedSummary,
      });
    }

    return NextResponse.json(
      {
        success: true,
        consolidated: Boolean(updatedSummary),
        patientMemory: updatedSummary ?? previousMemory,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[memory/consolidate] Erro ao consolidar memória:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erro ao consolidar memória longitudinal.",
      },
      { status: 500 }
    );
  }
}
