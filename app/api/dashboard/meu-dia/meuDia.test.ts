import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getMeuDiaDashboardData,
  getLocalDateString,
  getDayBoundsUtc,
  MeuDiaResponseSchema,
  DEFAULT_DASHBOARD_TIMEZONE,
} from "@/lib/db/dashboard";
import { GET } from "./route";

// Fake Supabase Client para testes unitários de banco
function createMockSupabaseClient(store: {
  appointments?: Array<Record<string, unknown>>;
  sessions?: Array<Record<string, unknown>>;
  patient_memory?: Array<Record<string, unknown>>;
  patients?: Array<Record<string, unknown>>;
  session_insights?: Array<Record<string, unknown>>;
  transcript_chunks?: Array<Record<string, unknown>>;
}) {
  return {
    from(tableName: string) {
      let data = [...(store[tableName as keyof typeof store] ?? [])];

      const queryBuilder: Record<string, unknown> = {
        select() {
          return queryBuilder;
        },
        eq(col: string, val: unknown) {
          data = data.filter((row) => row[col] === val);
          return queryBuilder;
        },
        neq(col: string, val: unknown) {
          data = data.filter((row) => row[col] !== val);
          return queryBuilder;
        },
        in(col: string, vals: unknown[]) {
          data = data.filter((row) => vals.includes(row[col]));
          return queryBuilder;
        },
        gte(col: string, val: string) {
          data = data.filter((row) => String(row[col]) >= val);
          return queryBuilder;
        },
        lte(col: string, val: string) {
          data = data.filter((row) => String(row[col]) <= val);
          return queryBuilder;
        },
        lt(col: string, val: string) {
          data = data.filter((row) => String(row[col]) < val);
          return queryBuilder;
        },
        order() {
          return queryBuilder;
        },
        async then(resolve: (res: { data: unknown[]; error: null }) => void) {
          resolve({ data, error: null });
        },
      };

      return queryBuilder;
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("Dashboard Meu Dia — Especificação & Validação do Endpoint (GET /api/dashboard/meu-dia)", () => {
  const therapistA = "11111111-1111-1111-1111-111111111111";
  const therapistB = "22222222-2222-2222-2222-222222222222";
  const patient1 = "33333333-3333-3333-3333-333333333333";
  const patient2 = "44444444-4444-4444-4444-444444444444";

  // Data fixa para os testes: 2026-09-27 às 14:00:00 (America/Sao_Paulo -> 17:00:00 UTC)
  const fixedReferenceDate = new Date("2026-09-27T17:00:00.000Z");

  it("1. Timezone: calcula corretamente a data local e os limites UTC em America/Sao_Paulo", () => {
    const localDateStr = getLocalDateString(fixedReferenceDate);
    assert.strictEqual(localDateStr, "2026-09-27");

    const bounds = getDayBoundsUtc(localDateStr);
    assert.strictEqual(bounds.startIso, "2026-09-27T03:00:00.000Z");
    assert.strictEqual(bounds.endIso, "2026-09-28T02:59:59.999Z");
    assert.strictEqual(DEFAULT_DASHBOARD_TIMEZONE, "America/Sao_Paulo");
  });

  it("2. Estado Vazio: retorna resumo zerado quando não há agendamentos hoje", async () => {
    const mockClient = createMockSupabaseClient({
      appointments: [],
      sessions: [],
      patient_memory: [],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate,
      supabaseClient: mockClient,
    });

    assert.strictEqual(result.date, "2026-09-27");
    assert.strictEqual(result.timezone, "America/Sao_Paulo");
    assert.strictEqual(result.summary.totalAppointmentsToday, 0);
    assert.strictEqual(result.summary.confirmedCount, 0);
    assert.strictEqual(result.summary.requestedCount, 0);
    assert.strictEqual(result.summary.upcomingCount, 0);
    assert.strictEqual(result.summary.pendingPostSessionCount, 0);
    assert.strictEqual(result.nextAppointment, null);
    assert.deepStrictEqual(result.todaySchedule, []);
    assert.deepStrictEqual(result.pendingPostSessions, []);

    // Validação com Zod Schema oficial
    assert.ok(MeuDiaResponseSchema.safeParse(result).success);
  });

  it("3. Agendamentos: mapeia status reais (requested/confirmed/cancelled) e isola por therapist_id", async () => {
    const mockClient = createMockSupabaseClient({
      appointments: [
        {
          id: "a1111111-1111-1111-1111-111111111111",
          therapist_id: therapistA,
          patient_id: patient1,
          status: "confirmed",
          scheduled_start: "2026-09-27T13:00:00.000Z", // 10:00 local (passado)
          scheduled_end: "2026-09-27T13:50:00.000Z",   // 10:50 local (passado)
          notes: "Atendimento matutino",
          patients: { id: patient1, full_name: "Paciente Um" },
        },
        {
          id: "a2222222-2222-2222-2222-222222222222",
          therapist_id: therapistA,
          patient_id: patient2,
          status: "requested",
          scheduled_start: "2026-09-27T18:00:00.000Z", // 15:00 local (futuro)
          scheduled_end: "2026-09-27T18:50:00.000Z",   // 15:50 local (futuro)
          notes: null,
          patients: { id: patient2, full_name: "Paciente Dois" },
        },
        {
          id: "a3333333-3333-3333-3333-333333333333",
          therapist_id: therapistA,
          patient_id: patient1,
          status: "cancelled",
          scheduled_start: "2026-09-27T20:00:00.000Z",
          scheduled_end: "2026-09-27T20:50:00.000Z",
          notes: "Cancelado pelo paciente",
          patients: { id: patient1, full_name: "Paciente Um" },
        },
        // Agendamento do Terapeuta B (não deve aparecer para Terapeuta A)
        {
          id: "a4444444-4444-4444-4444-444444444444",
          therapist_id: therapistB,
          patient_id: "patient-b",
          status: "confirmed",
          scheduled_start: "2026-09-27T18:00:00.000Z",
          scheduled_end: "2026-09-27T18:50:00.000Z",
          patients: { id: "patient-b", full_name: "Paciente Estranho" },
        },
      ],
      sessions: [],
      patient_memory: [],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate, // 14:00 local
      supabaseClient: mockClient,
    });

    assert.strictEqual(result.summary.totalAppointmentsToday, 3);
    assert.strictEqual(result.summary.confirmedCount, 1);
    assert.strictEqual(result.summary.requestedCount, 1);
    assert.strictEqual(result.summary.upcomingCount, 1); // a2222222 (15h) é o único futuro não-cancelado

    assert.strictEqual(result.todaySchedule.length, 3);
    assert.strictEqual(result.todaySchedule[0].status, "confirmed");
    assert.strictEqual(result.todaySchedule[1].status, "requested");
    assert.strictEqual(result.todaySchedule[2].status, "cancelled");
  });

  it("4. Próximo Atendimento: ignora agendamentos já finalizados ou cancelados e seleciona o iminente", async () => {
    const mockClient = createMockSupabaseClient({
      appointments: [
        {
          id: "a1111111-1111-1111-1111-111111111111",
          therapist_id: therapistA,
          patient_id: patient1,
          status: "confirmed",
          scheduled_start: "2026-09-27T13:00:00.000Z", // 10h local
          scheduled_end: "2026-09-27T13:50:00.000Z",   // 10:50h local (passado relativo a 14h)
          patients: { id: patient1, full_name: "Paciente Passado" },
        },
        {
          id: "a2222222-2222-2222-2222-222222222222",
          therapist_id: therapistA,
          patient_id: patient2,
          status: "confirmed",
          scheduled_start: "2026-09-27T18:00:00.000Z", // 15h local (futuro!)
          scheduled_end: "2026-09-27T18:50:00.000Z",   // 15:50h local
          patients: { id: patient2, full_name: "Paciente Próximo" },
        },
      ],
      sessions: [],
      patient_memory: [],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate, // 14h local
      supabaseClient: mockClient,
    });

    assert.ok(result.nextAppointment);
    assert.strictEqual(result.nextAppointment.appointmentId, "a2222222-2222-2222-2222-222222222222");
    assert.strictEqual(result.nextAppointment.patientName, "Paciente Próximo");

    // Verifica que a flag isNext é verdadeira apenas para o segundo item
    assert.strictEqual(result.todaySchedule[0].isNext, false);
    assert.strictEqual(result.todaySchedule[1].isNext, true);
  });

  it("5. Sessão do Atendimento: resolve sessionId caso já tenha sido iniciada hoje pelo terapeuta", async () => {
    const todaySessionId = "s5555555-5555-5555-5555-555555555555";
    const mockClient = createMockSupabaseClient({
      appointments: [
        {
          id: "a1111111-1111-1111-1111-111111111111",
          therapist_id: therapistA,
          patient_id: patient1,
          status: "confirmed",
          scheduled_start: "2026-09-27T18:00:00.000Z",
          scheduled_end: "2026-09-27T18:50:00.000Z",
          patients: { id: patient1, full_name: "Paciente Com Sessão" },
        },
      ],
      sessions: [
        {
          id: todaySessionId,
          therapist_id: therapistA,
          patient_id: patient1,
          created_at: "2026-09-27T14:30:00.000Z", // Criada hoje
        },
      ],
      patient_memory: [],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate,
      supabaseClient: mockClient,
    });

    assert.strictEqual(result.nextAppointment?.sessionId, todaySessionId);
    assert.strictEqual(result.todaySchedule[0].sessionId, todaySessionId);
  });

  it("6. Contexto Clínico Pré-Sessão: recupera memória, última sessão, themes e activeRisks", async () => {
    const prevSessionDate = "2026-09-20T17:00:00.000Z";
    const mockClient = createMockSupabaseClient({
      appointments: [
        {
          id: "a1111111-1111-1111-1111-111111111111",
          therapist_id: therapistA,
          patient_id: patient1,
          status: "confirmed",
          scheduled_start: "2026-09-27T18:00:00.000Z",
          scheduled_end: "2026-09-27T18:50:00.000Z",
          patients: { id: patient1, full_name: "Paciente Contextualizado" },
        },
      ],
      sessions: [
        {
          id: "s-prev-01",
          therapist_id: therapistA,
          patient_id: patient1,
          created_at: prevSessionDate,
          session_insights: [
            {
              id: "ins-1",
              kind: "themes",
              content_json: {
                themes: [
                  { title: "Sobrecarga no trabalho", description: "Muita pressão", evidence: [] },
                  { title: "Relações familiares", description: "Conflito com o pai", evidence: [] },
                ],
              },
              archived_at: null,
            },
            {
              id: "ins-2",
              kind: "risks",
              content_json: {
                risks: [
                  { type: "Burnout", note: "Sintomas de estafa aguda", urgency: "alta", evidence: [] },
                ],
              },
              archived_at: null,
            },
          ],
        },
      ],
      patient_memory: [
        {
          patient_id: patient1,
          therapist_id: therapistA,
          summary: "Histórico de ansiedade e sobrecarga profissional.",
          updated_at: prevSessionDate,
        },
      ],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate,
      supabaseClient: mockClient,
    });

    const brief = result.nextAppointment?.clinicalBrief;
    assert.ok(brief);
    assert.strictEqual(brief.patientSummary, "Histórico de ansiedade e sobrecarga profissional.");
    assert.strictEqual(brief.lastSessionDate, prevSessionDate);
    assert.deepStrictEqual(brief.lastSessionThemes, ["Sobrecarga no trabalho", "Relações familiares"]);
    assert.strictEqual(brief.activeRisks.length, 1);
    assert.strictEqual(brief.activeRisks[0].type, "Burnout");
    assert.strictEqual(brief.activeRisks[0].urgency, "alta");
    assert.strictEqual(result.todaySchedule[0].hasActiveAlert, true);
  });

  it("7. Pendências Pós-Sessão: detecta sessões com transcrição (>45min) sem resumo ativo", async () => {
    const mockClient = createMockSupabaseClient({
      appointments: [],
      sessions: [
        // Sessão 1: Criada há 2 horas, com chunks gravados e SEM resumo -> DEVE ser pendência
        {
          id: "s-pending-01",
          therapist_id: therapistA,
          patient_id: patient1,
          created_at: "2026-09-27T15:00:00.000Z", // 2 horas antes das 17h
          patients: { id: patient1, full_name: "Paciente Pendente" },
          transcript_chunks: [{ id: "c1" }, { id: "c2" }],
          session_insights: [], // sem summary
        },
        // Sessão 2: Criada há 15 minutos (em andamento) -> NÃO deve ser pendência
        {
          id: "s-recent-02",
          therapist_id: therapistA,
          patient_id: patient2,
          created_at: "2026-09-27T16:45:00.000Z", // 15 minutos antes
          patients: { id: patient2, full_name: "Paciente Em Andamento" },
          transcript_chunks: [{ id: "c3" }],
          session_insights: [],
        },
        // Sessão 3: Criada há 1 dia, com resumo ativo gerado -> NÃO deve ser pendência
        {
          id: "s-done-03",
          therapist_id: therapistA,
          patient_id: patient1,
          created_at: "2026-09-26T14:00:00.000Z",
          patients: { id: patient1, full_name: "Paciente Finalizado" },
          transcript_chunks: [{ id: "c4" }],
          session_insights: [{ id: "ins-sum", kind: "summary", archived_at: null }],
        },
      ],
      patient_memory: [],
    });

    const result = await getMeuDiaDashboardData({
      therapistId: therapistA,
      referenceDate: fixedReferenceDate,
      supabaseClient: mockClient,
    });

    assert.strictEqual(result.summary.pendingPostSessionCount, 1);
    assert.strictEqual(result.pendingPostSessions.length, 1);
    assert.strictEqual(result.pendingPostSessions[0].sessionId, "s-pending-01");
    assert.strictEqual(result.pendingPostSessions[0].chunksCount, 2);
    assert.strictEqual(result.pendingPostSessions[0].needsSummary, true);
  });

  it("8. Rota HTTP: retorna 401 para requisição sem autenticação", async () => {
    const req = new NextRequest("http://localhost:3000/api/dashboard/meu-dia");
    const res = await GET(req);
    assert.strictEqual(res.status, 401);
    const json = (await res.json()) as { error: string };
    assert.strictEqual(json.error, "Não autenticado");
  });
});
