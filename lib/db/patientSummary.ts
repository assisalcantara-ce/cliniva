import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Schemas Zod para Validação e Tipagem do Prontuário Inteligente (Fase 1)
// ---------------------------------------------------------------------------

export const ClinicalPatientInfoSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  patientNumber: z.number().nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().min(1),
});

export const ClinicalRiskItemSchema = z.object({
  type: z.string().min(1),
  note: z.string(),
  urgency: z.enum(["low", "med", "high", "alta", "media", "baixa"]),
});

export const ClinicalSummaryContextSchema = z.object({
  memorySummary: z.string().nullable(),
  anamnesis: z.record(z.string(), z.unknown()).nullable(),
  recurringThemes: z.array(z.string()),
  activeRisks: z.array(ClinicalRiskItemSchema),
  lastSessionDate: z.string().nullable(),
});

export const ClinicalTimelineItemSchema = z.object({
  sessionId: z.string().min(1),
  date: z.string().min(1),
  hasTranscript: z.boolean(),
  hasInsights: z.boolean(),
  themes: z.array(z.string()),
  risks: z.array(ClinicalRiskItemSchema),
  summary: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export const ClinicalSummaryResponseSchema = z.object({
  patient: ClinicalPatientInfoSchema,
  clinicalContext: ClinicalSummaryContextSchema,
  timeline: z.array(ClinicalTimelineItemSchema),
});

export type ClinicalPatientInfo = z.infer<typeof ClinicalPatientInfoSchema>;
export type ClinicalRiskItem = z.infer<typeof ClinicalRiskItemSchema>;
export type ClinicalSummaryContext = z.infer<typeof ClinicalSummaryContextSchema>;
export type ClinicalTimelineItem = z.infer<typeof ClinicalTimelineItemSchema>;
export type ClinicalSummaryResponse = z.infer<typeof ClinicalSummaryResponseSchema>;

// ---------------------------------------------------------------------------
// Regras de Extração e Agregação
// ---------------------------------------------------------------------------

interface GetPatientClinicalSummaryParams {
  patientId: string;
  therapistId: string;
  limitSessions?: number;
  supabaseClient?: SupabaseClient;
}

/**
 * Consulta de alta performance para extrair todo o contexto clínico consolidado
 * de um paciente sem N+1, isolado estritamente por therapistId e patientId.
 */
export async function getPatientClinicalSummary(
  params: GetPatientClinicalSummaryParams
): Promise<ClinicalSummaryResponse | null> {
  const {
    patientId,
    therapistId,
    limitSessions = 10,
    supabaseClient,
  } = params;

  let client = supabaseClient;
  if (!client) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    client = createSupabaseAdminClient();
  }

  // 1. Busca paciente e anamnese garantindo isolamento estrito por therapist_id
  const patientQuery = await client
    .from("patients")
    .select(`
      id,
      full_name,
      patient_number,
      is_active,
      notes,
      created_at,
      patient_anamnesis (
        payload
      )
    `)
    .eq("id", patientId)
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (patientQuery.error) {
    throw new Error(`Erro ao buscar paciente: ${patientQuery.error.message}`);
  }

  if (!patientQuery.data) {
    return null;
  }

  const pData = patientQuery.data as {
    id: string;
    full_name: string;
    patient_number: number | null;
    is_active: boolean | null;
    notes: string | null;
    created_at: string;
    patient_anamnesis?: Array<{ payload: Record<string, unknown> | null }>;
  };

  const patient: ClinicalPatientInfo = {
    id: pData.id,
    fullName: pData.full_name,
    patientNumber: pData.patient_number ?? null,
    isActive: pData.is_active !== false,
    notes: pData.notes ?? null,
    createdAt: pData.created_at,
  };

  const anamnesisPayload =
    Array.isArray(pData.patient_anamnesis) && pData.patient_anamnesis.length > 0
      ? pData.patient_anamnesis[0].payload ?? null
      : null;

  // 2. Busca memória longitudinal em patient_memory
  let memorySummary: string | null = null;
  const memoryQuery = await client
    .from("patient_memory")
    .select("summary")
    .eq("patient_id", patientId)
    .eq("therapist_id", therapistId)
    .maybeSingle();

  if (memoryQuery.data && memoryQuery.data.summary) {
    memorySummary = memoryQuery.data.summary;
  }

  // 3. Busca últimas N sessões do paciente com contagem de trechos e insights ativos (batch)
  const sessionsQuery = await client
    .from("sessions")
    .select(`
      id,
      created_at,
      transcript_chunks (count),
      session_insights (
        id,
        kind,
        title,
        content_json,
        archived_at
      )
    `)
    .eq("patient_id", patientId)
    .eq("therapist_id", therapistId)
    .order("created_at", { ascending: false })
    .limit(limitSessions);

  if (sessionsQuery.error) {
    throw new Error(`Erro ao buscar sessões do paciente: ${sessionsQuery.error.message}`);
  }

  const rawSessions = sessionsQuery.data ?? [];

  const timeline: ClinicalTimelineItem[] = [];
  const themeOccurrences = new Map<string, number>();
  let activeRisks: ClinicalRiskItem[] = [];
  let lastSessionDate: string | null = null;

  for (let idx = 0; idx < rawSessions.length; idx += 1) {
    const sess = rawSessions[idx] as {
      id: string;
      created_at: string;
      transcript_chunks?: Array<{ count?: number }>;
      session_insights?: Array<{
        id: string;
        kind: string;
        title: string | null;
        content_json: unknown;
        archived_at: string | null;
      }>;
    };

    if (idx === 0) {
      lastSessionDate = sess.created_at;
    }

    const chunkCount =
      Array.isArray(sess.transcript_chunks) && sess.transcript_chunks.length > 0
        ? sess.transcript_chunks[0]?.count ?? 0
        : 0;

    const rawInsights = Array.isArray(sess.session_insights)
      ? sess.session_insights
      : [];
    const activeInsights = rawInsights.filter((i) => !i.archived_at);

    const sessionThemes: string[] = [];
    const sessionRisks: ClinicalRiskItem[] = [];
    const sessionSummaryBullets: string[] = [];
    const sessionNextSteps: string[] = [];

    for (const insight of activeInsights) {
      const content = insight.content_json as Record<string, unknown> | null;

      if (insight.kind === "themes" && content) {
        if (Array.isArray(content.themes)) {
          for (const t of content.themes) {
            const title = typeof t === "object" && t !== null && "title" in t && typeof (t as { title: unknown }).title === "string"
              ? (t as { title: string }).title.trim()
              : typeof t === "string"
              ? t.trim()
              : null;
            if (title) {
              sessionThemes.push(title);
              themeOccurrences.set(title, (themeOccurrences.get(title) ?? 0) + 1);
            }
          }
        }
      } else if (insight.kind === "risks" && content) {
        if (Array.isArray(content.risks)) {
          for (const r of content.risks) {
            if (typeof r === "object" && r !== null) {
              const rObj = r as { type?: unknown; note?: unknown; urgency?: unknown };
              const typeStr = typeof rObj.type === "string" && rObj.type.trim() ? rObj.type.trim() : "Risco Clínico";
              const noteStr = typeof rObj.note === "string" ? rObj.note.trim() : "";
              const rawUrgency = typeof rObj.urgency === "string" ? rObj.urgency.toLowerCase() : "med";
              const validUrgency: ClinicalRiskItem["urgency"] =
                rawUrgency === "high" || rawUrgency === "alta"
                  ? "high"
                  : rawUrgency === "low" || rawUrgency === "baixa"
                  ? "low"
                  : "med";

              sessionRisks.push({
                type: typeStr,
                note: noteStr,
                urgency: validUrgency,
              });
            }
          }
        }
      } else if (insight.kind === "summary" && content) {
        // Suporta: content.summary.bullets, content.bullets, content.summary (string), content (string)
        if (typeof content.summary === "object" && content.summary !== null && Array.isArray((content.summary as { bullets?: unknown[] }).bullets)) {
          for (const b of (content.summary as { bullets: unknown[] }).bullets) {
            if (typeof b === "string" && b.trim()) {
              sessionSummaryBullets.push(b.trim());
            }
          }
        } else if (Array.isArray(content.bullets)) {
          for (const b of content.bullets) {
            if (typeof b === "string" && b.trim()) {
              sessionSummaryBullets.push(b.trim());
            }
          }
        } else if (typeof content.summary === "string" && content.summary.trim()) {
          const lines = content.summary.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
          sessionSummaryBullets.push(...lines);
        } else if (typeof (content as unknown) === "string" && (content as unknown as string).trim()) {
          const lines = (content as unknown as string).split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
          sessionSummaryBullets.push(...lines);
        }
      } else if ((insight.kind === "next_steps" || insight.kind === "suggested_next_steps") && content) {
        // Suporta: next_steps, suggested_next_steps, com strings ou objetos { step } ou { action }
        const rawSteps =
          content.next_steps ??
          content.suggested_next_steps ??
          (Array.isArray(content) ? content : null);

        if (Array.isArray(rawSteps)) {
          for (const s of rawSteps) {
            if (typeof s === "object" && s !== null) {
              const sObj = s as { step?: unknown; action?: unknown };
              const text =
                typeof sObj.step === "string"
                  ? sObj.step.trim()
                  : typeof sObj.action === "string"
                  ? sObj.action.trim()
                  : null;
              if (text) sessionNextSteps.push(text);
            } else if (typeof s === "string" && s.trim()) {
              sessionNextSteps.push(s.trim());
            }
          }
        } else if (typeof content.next_steps === "string" && content.next_steps.trim()) {
          sessionNextSteps.push(content.next_steps.trim());
        }
      }
    }

    // Se for a sessão mais recente, os riscos dela são considerados activeRisks no contexto clínico
    if (idx === 0 && sessionRisks.length > 0) {
      activeRisks = [...sessionRisks];
    }

    timeline.push({
      sessionId: sess.id,
      date: sess.created_at,
      hasTranscript: chunkCount > 0,
      hasInsights: activeInsights.length > 0,
      themes: sessionThemes,
      risks: sessionRisks,
      summary: sessionSummaryBullets,
      nextSteps: sessionNextSteps,
    });
  }

  // Ordenar temas recorrentes pelos mais frequentes (mínimo 1 ocorrência, top 5)
  let recurringThemes = Array.from(themeOccurrences.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme)
    .slice(0, 5);

  // Se não houver temas estruturados suficientes na timeline, tentar extrair defensivamente de patient_memory
  if (recurringThemes.length === 0 && memorySummary) {
    const trimmedMem = memorySummary.trim();
    if (trimmedMem.startsWith("{") && trimmedMem.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmedMem) as Record<string, unknown>;
        const rawMemThemes =
          parsed.temas_principais ??
          parsed.padroes_recorrentes ??
          parsed.temas ??
          parsed.themes ??
          parsed.recurringThemes ??
          parsed["padrões_recorrentes"];

        if (Array.isArray(rawMemThemes)) {
          for (const item of rawMemThemes) {
            if (typeof item === "string" && item.trim()) {
              recurringThemes.push(item.trim());
            } else if (typeof item === "object" && item !== null) {
              const title = (item as { title?: unknown; nome?: unknown; tema?: unknown }).title ||
                (item as { title?: unknown; nome?: unknown; tema?: unknown }).nome ||
                (item as { title?: unknown; nome?: unknown; tema?: unknown }).tema;
              if (typeof title === "string" && title.trim()) {
                recurringThemes.push(title.trim());
              }
            }
          }
        } else if (typeof rawMemThemes === "string" && rawMemThemes.trim()) {
          const splitThemes = rawMemThemes.split(/[,\n•;]+/).map((t) => t.trim()).filter(Boolean);
          recurringThemes.push(...splitThemes);
        }
      } catch {
        // Fallback silencioso
      }
    }
    recurringThemes = recurringThemes.slice(0, 5);
  }

  const clinicalContext: ClinicalSummaryContext = {
    memorySummary,
    anamnesis: anamnesisPayload,
    recurringThemes,
    activeRisks,
    lastSessionDate,
  };

  const response: ClinicalSummaryResponse = {
    patient,
    clinicalContext,
    timeline,
  };

  return ClinicalSummaryResponseSchema.parse(response);
}
