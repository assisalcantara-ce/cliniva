import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_DASHBOARD_TIMEZONE = "America/Sao_Paulo" as const;

/**
 * Zod Schema para validação estrita da resposta do endpoint /api/dashboard/meu-dia.
 */
export const MeuDiaClinicalRiskSchema = z.object({
  type: z.string(),
  note: z.string(),
  urgency: z.string(),
});

export const MeuDiaClinicalBriefSchema = z.object({
  patientSummary: z.string().nullable(),
  lastSessionDate: z.string().nullable(),
  lastSessionThemes: z.array(z.string()),
  activeRisks: z.array(MeuDiaClinicalRiskSchema),
});

export const MeuDiaAppointmentStatusSchema = z.enum([
  "requested",
  "confirmed",
  "cancelled",
]);

export const MeuDiaNextAppointmentSchema = z.object({
  appointmentId: z.string(),
  sessionId: z.string().nullable(),
  patientId: z.string(),
  patientName: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  status: MeuDiaAppointmentStatusSchema,
  durationMinutes: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  clinicalBrief: MeuDiaClinicalBriefSchema,
});

export const MeuDiaScheduleItemSchema = z.object({
  appointmentId: z.string(),
  sessionId: z.string().nullable(),
  patientId: z.string(),
  patientName: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  status: MeuDiaAppointmentStatusSchema,
  durationMinutes: z.number().int().nonnegative(),
  isNext: z.boolean(),
  hasActiveAlert: z.boolean(),
  notes: z.string().nullable(),
});

export const MeuDiaPendingPostSessionSchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  sessionDate: z.string(),
  chunksCount: z.number().int().positive(),
  needsSummary: z.boolean(),
});

export const MeuDiaSummarySchema = z.object({
  totalAppointmentsToday: z.number().int().nonnegative(),
  confirmedCount: z.number().int().nonnegative(),
  requestedCount: z.number().int().nonnegative(),
  upcomingCount: z.number().int().nonnegative(),
  pendingPostSessionCount: z.number().int().nonnegative(),
});

export const MeuDiaResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.literal(DEFAULT_DASHBOARD_TIMEZONE),
  summary: MeuDiaSummarySchema,
  nextAppointment: MeuDiaNextAppointmentSchema.nullable(),
  todaySchedule: z.array(MeuDiaScheduleItemSchema),
  pendingPostSessions: z.array(MeuDiaPendingPostSessionSchema),
});

export type MeuDiaResponse = z.infer<typeof MeuDiaResponseSchema>;
export type MeuDiaNextAppointment = z.infer<typeof MeuDiaNextAppointmentSchema>;
export type MeuDiaScheduleItem = z.infer<typeof MeuDiaScheduleItemSchema>;
export type MeuDiaPendingPostSession = z.infer<typeof MeuDiaPendingPostSessionSchema>;

/**
 * Obtém a data local formatada YYYY-MM-DD no fuso horário America/Sao_Paulo.
 */
export function getLocalDateString(
  date: Date = new Date(),
  timezone: string = DEFAULT_DASHBOARD_TIMEZONE
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Retorna os limites UTC ISO correspondentes a 00:00:00 e 23:59:59 no fuso America/Sao_Paulo.
 */
export function getDayBoundsUtc(
  dateStr: string,
  timezone: string = DEFAULT_DASHBOARD_TIMEZONE
): { startIso: string; endIso: string } {
  if (timezone !== DEFAULT_DASHBOARD_TIMEZONE) {
    throw new Error(`Timezone não suportado: ${timezone}`);
  }
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  const end = new Date(`${dateStr}T23:59:59.999-03:00`);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

interface GetMeuDiaDashboardParams {
  therapistId: string;
  referenceDate?: Date;
  supabaseClient?: SupabaseClient;
}

/**
 * Busca e agrega em alta performance todos os dados do painel "Meu Dia".
 * Executa apenas consultas em lote direcionadas, eliminando o padrão N+1.
 */
export async function getMeuDiaDashboardData(
  params: GetMeuDiaDashboardParams
): Promise<MeuDiaResponse> {
  const {
    therapistId,
    referenceDate = new Date(),
    supabaseClient,
  } = params;

  let client = supabaseClient;
  if (!client) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    client = createSupabaseAdminClient();
  }

  const todayDateStr = getLocalDateString(referenceDate);
  const { startIso: startOfDayIso, endIso: endOfDayIso } = getDayBoundsUtc(todayDateStr);

  const sevenDaysAgoIso = new Date(
    referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const fortyFiveMinutesAgoIso = new Date(
    referenceDate.getTime() - 45 * 60 * 1000
  ).toISOString();

  // 1. Query 1: Agendamentos do dia atual
  const appointmentsQuery = await client
    .from("appointments")
    .select(`
      id,
      patient_id,
      therapist_id,
      status,
      source,
      scheduled_start,
      scheduled_end,
      notes,
      patients (id, full_name)
    `)
    .eq("therapist_id", therapistId)
    .gte("scheduled_start", startOfDayIso)
    .lte("scheduled_start", endOfDayIso)
    .order("scheduled_start", { ascending: true });

  if (appointmentsQuery.error) {
    throw new Error(`Erro ao buscar agendamentos: ${appointmentsQuery.error.message}`);
  }

  const rawAppointments = appointmentsQuery.data ?? [];
  const todayPatientIds = Array.from(
    new Set(rawAppointments.map((a) => a.patient_id).filter(Boolean))
  );

  // 2. Query 2: Sessões já criadas hoje para o mesmo terapeuta (resolução de sessionId)
  const todaySessionsQuery = await client
    .from("sessions")
    .select("id, patient_id, created_at")
    .eq("therapist_id", therapistId)
    .gte("created_at", startOfDayIso)
    .lte("created_at", endOfDayIso)
    .order("created_at", { ascending: false });

  const todaySessions = todaySessionsQuery.data ?? [];
  const sessionByPatientId = new Map<string, string>();
  for (const s of todaySessions) {
    if (!sessionByPatientId.has(s.patient_id)) {
      sessionByPatientId.set(s.patient_id, s.id);
    }
  }

  // 3. Query 3: Memória clínica dos pacientes com atendimento hoje
  const memoryByPatientId = new Map<string, string>();
  if (todayPatientIds.length > 0) {
    const memoryQuery = await client
      .from("patient_memory")
      .select("patient_id, summary")
      .eq("therapist_id", therapistId)
      .in("patient_id", todayPatientIds);

    if (memoryQuery.data) {
      for (const m of memoryQuery.data) {
        if (m.summary) {
          memoryByPatientId.set(m.patient_id, m.summary);
        }
      }
    }
  }

  // 4. Query 4: Sessões anteriores dos pacientes de hoje (para temas e alertas prévios)
  interface PatientPreviousClinical {
    lastSessionDate: string | null;
    themes: string[];
    risks: Array<{ type: string; note: string; urgency: string }>;
  }
  const previousClinicalByPatientId = new Map<string, PatientPreviousClinical>();

  if (todayPatientIds.length > 0) {
    const previousSessionsQuery = await client
      .from("sessions")
      .select(`
        id,
        patient_id,
        created_at,
        session_insights (
          id,
          kind,
          title,
          content_json,
          archived_at
        )
      `)
      .eq("therapist_id", therapistId)
      .in("patient_id", todayPatientIds)
      .lt("created_at", startOfDayIso)
      .order("created_at", { ascending: false });

    if (previousSessionsQuery.data) {
      for (const sess of previousSessionsQuery.data) {
        if (previousClinicalByPatientId.has(sess.patient_id)) {
          continue; // Já pegou a sessão mais recente do paciente
        }

        const rawInsights = Array.isArray(sess.session_insights)
          ? sess.session_insights
          : [];
        const activeInsights = rawInsights.filter((i) => !i.archived_at);

        const themes: string[] = [];
        const risks: Array<{ type: string; note: string; urgency: string }> = [];

        for (const insight of activeInsights) {
          if (insight.kind === "themes" && insight.content_json) {
            const parsed = insight.content_json as {
              themes?: Array<{ title?: string }>;
            };
            if (Array.isArray(parsed.themes)) {
              for (const t of parsed.themes) {
                if (t.title && typeof t.title === "string") {
                  themes.push(t.title);
                }
              }
            }
          } else if (insight.kind === "risks" && insight.content_json) {
            const parsed = insight.content_json as {
              risks?: Array<{ type?: string; note?: string; urgency?: string }>;
            };
            if (Array.isArray(parsed.risks)) {
              for (const r of parsed.risks) {
                if (r.type || r.note) {
                  risks.push({
                    type: r.type ?? "Risco Clínico",
                    note: r.note ?? "",
                    urgency: r.urgency ?? "media",
                  });
                }
              }
            }
          }
        }

        previousClinicalByPatientId.set(sess.patient_id, {
          lastSessionDate: sess.created_at,
          themes,
          risks,
        });
      }
    }
  }

  // 5. Query 5: Pendências pós-sessão (sessões finalizadas > 45min sem resumo ativo)
  const pendingSessionsQuery = await client
    .from("sessions")
    .select(`
      id,
      patient_id,
      created_at,
      patients (id, full_name),
      transcript_chunks (id),
      session_insights (id, kind, archived_at)
    `)
    .eq("therapist_id", therapistId)
    .gte("created_at", sevenDaysAgoIso)
    .lte("created_at", fortyFiveMinutesAgoIso)
    .order("created_at", { ascending: false });

  const pendingPostSessions: MeuDiaPendingPostSession[] = [];
  if (pendingSessionsQuery.data) {
    for (const s of pendingSessionsQuery.data) {
      const chunks = Array.isArray(s.transcript_chunks) ? s.transcript_chunks : [];
      if (chunks.length === 0) continue;

      const insights = Array.isArray(s.session_insights) ? s.session_insights : [];
      const hasActiveSummary = insights.some(
        (i) => i.kind === "summary" && !i.archived_at
      );

      if (!hasActiveSummary) {
        const patientObj = Array.isArray(s.patients) ? s.patients[0] : s.patients;
        const patientName =
          patientObj && typeof patientObj.full_name === "string"
            ? patientObj.full_name
            : "Paciente";

        pendingPostSessions.push({
          sessionId: s.id,
          patientId: s.patient_id,
          patientName,
          sessionDate: s.created_at,
          chunksCount: chunks.length,
          needsSummary: true,
        });
      }
    }
  }

  // 6. Processamento dos Agendamentos e Determinação do Próximo Atendimento
  const nowMs = referenceDate.getTime();
  let nextApptCandidate: (typeof rawAppointments)[0] | null = null;
  let nextApptIndex = -1;

  for (let i = 0; i < rawAppointments.length; i++) {
    const appt = rawAppointments[i];
    if (appt.status === "cancelled") continue;

    const endMs = new Date(appt.scheduled_end).getTime();
    if (endMs > nowMs) {
      nextApptCandidate = appt;
      nextApptIndex = i;
      break;
    }
  }

  const todaySchedule: MeuDiaScheduleItem[] = rawAppointments.map((appt, idx) => {
    const patientObj = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients;
    const patientName =
      patientObj && typeof patientObj.full_name === "string"
        ? patientObj.full_name
        : "Paciente";

    const startMs = new Date(appt.scheduled_start).getTime();
    const endMs = new Date(appt.scheduled_end).getTime();
    const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));

    const clinical = previousClinicalByPatientId.get(appt.patient_id);
    const hasActiveAlert = (clinical?.risks.length ?? 0) > 0;
    const isNext = idx === nextApptIndex;
    const status = (
      ["requested", "confirmed", "cancelled"].includes(appt.status)
        ? appt.status
        : "requested"
    ) as MeuDiaScheduleItem["status"];

    return {
      appointmentId: appt.id,
      sessionId: sessionByPatientId.get(appt.patient_id) ?? null,
      patientId: appt.patient_id,
      patientName,
      scheduledStart: appt.scheduled_start,
      scheduledEnd: appt.scheduled_end,
      status,
      durationMinutes,
      isNext,
      hasActiveAlert,
      notes: appt.notes ?? null,
    };
  });

  // 7. Montagem do nextAppointment detalhado com clinicalBrief
  let nextAppointment: MeuDiaNextAppointment | null = null;
  if (nextApptCandidate) {
    const patientObj = Array.isArray(nextApptCandidate.patients)
      ? nextApptCandidate.patients[0]
      : nextApptCandidate.patients;
    const patientName =
      patientObj && typeof patientObj.full_name === "string"
        ? patientObj.full_name
        : "Paciente";

    const startMs = new Date(nextApptCandidate.scheduled_start).getTime();
    const endMs = new Date(nextApptCandidate.scheduled_end).getTime();
    const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
    const clinical = previousClinicalByPatientId.get(nextApptCandidate.patient_id);
    const patientSummary = memoryByPatientId.get(nextApptCandidate.patient_id) ?? null;

    const status = (
      ["requested", "confirmed", "cancelled"].includes(nextApptCandidate.status)
        ? nextApptCandidate.status
        : "requested"
    ) as MeuDiaNextAppointment["status"];

    nextAppointment = {
      appointmentId: nextApptCandidate.id,
      sessionId: sessionByPatientId.get(nextApptCandidate.patient_id) ?? null,
      patientId: nextApptCandidate.patient_id,
      patientName,
      scheduledStart: nextApptCandidate.scheduled_start,
      scheduledEnd: nextApptCandidate.scheduled_end,
      status,
      durationMinutes,
      notes: nextApptCandidate.notes ?? null,
      clinicalBrief: {
        patientSummary,
        lastSessionDate: clinical?.lastSessionDate ?? null,
        lastSessionThemes: clinical?.themes ?? [],
        activeRisks: clinical?.risks ?? [],
      },
    };
  }

  // 8. Métricas Resumidas
  const totalAppointmentsToday = todaySchedule.length;
  const confirmedCount = todaySchedule.filter((a) => a.status === "confirmed").length;
  const requestedCount = todaySchedule.filter((a) => a.status === "requested").length;
  const upcomingCount = todaySchedule.filter(
    (a) =>
      a.status !== "cancelled" &&
      new Date(a.scheduledStart).getTime() > nowMs
  ).length;

  const result: MeuDiaResponse = {
    date: todayDateStr,
    timezone: DEFAULT_DASHBOARD_TIMEZONE,
    summary: {
      totalAppointmentsToday,
      confirmedCount,
      requestedCount,
      upcomingCount,
      pendingPostSessionCount: pendingPostSessions.length,
    },
    nextAppointment,
    todaySchedule,
    pendingPostSessions,
  };

  return MeuDiaResponseSchema.parse(result);
}
