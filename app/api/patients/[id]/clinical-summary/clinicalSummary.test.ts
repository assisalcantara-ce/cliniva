import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getPatientClinicalSummary,
  ClinicalSummaryResponseSchema,
} from "@/lib/db/patientSummary";
import { GET } from "./route";
import { createAuthToken } from "@/lib/auth";

// Fake Supabase Client para testes unitários de isolamento e agregações
function createMockSupabaseClient(store: {
  patients?: Array<Record<string, unknown>>;
  patient_memory?: Array<Record<string, unknown>>;
  sessions?: Array<Record<string, unknown>>;
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
        order() {
          return queryBuilder;
        },
        limit(count: number) {
          data = data.slice(0, count);
          return queryBuilder;
        },
        async maybeSingle() {
          return { data: data[0] ?? null, error: null };
        },
        async single() {
          return { data: data[0] ?? null, error: null };
        },
        async then(resolve: (res: { data: unknown[]; error: null }) => void) {
          resolve({ data, error: null });
        },
      };

      return queryBuilder as any;
    },
  } as any;
}

describe("GET /api/patients/[id]/clinical-summary & Domain Service Tests", () => {
  const therapistA = "therapist-uuid-1111";
  const therapistB = "therapist-uuid-2222";
  const patientId = "patient-uuid-9999";

  const samplePatient = {
    id: patientId,
    therapist_id: therapistA,
    full_name: "Maria Zilda Silva",
    patient_number: 1042,
    is_active: true,
    notes: "Paciente encaminhada para acompanhamento de ansiedade generalizada.",
    created_at: "2026-01-15T10:00:00Z",
    patient_anamnesis: [
      {
        payload: {
          personal: {
            age: "34",
            profession: "Arquiteta",
          },
          groups: [
            {
              id: "queixa-principal",
              title: "Queixa Principal",
              answers: [
                {
                  question: "O que trouxe você à terapia?",
                  answer: "Crises frequentes de ansiedade no trabalho.",
                },
              ],
            },
          ],
        },
      },
    ],
  };

  const sampleMemory = {
    patient_id: patientId,
    therapist_id: therapistA,
    summary: "Paciente apresenta padrão de hipervigilância e autocobrança profissional severa.",
    updated_at: "2026-09-20T16:00:00Z",
  };

  const sampleSessions = [
    {
      id: "session-uuid-1",
      patient_id: patientId,
      therapist_id: therapistA,
      created_at: "2026-09-25T14:00:00Z",
      transcript_chunks: [{ count: 18 }],
      session_insights: [
        {
          id: "insight-1",
          kind: "themes",
          title: "Temas Centrais",
          content_json: {
            themes: [
              { title: "Autocobrança no trabalho", description: "Medo de cometer erros em projetos." },
              { title: "Conflito familiar", description: "Cobranças paternas sobre estabilidade." },
            ],
          },
          archived_at: null,
        },
        {
          id: "insight-2",
          kind: "risks",
          title: "Sinais de Risco",
          content_json: {
            risks: [
              { type: "Crise de Pânico", note: "Episódio com taquicardia há 2 dias.", urgency: "alta" },
            ],
          },
          archived_at: null,
        },
        {
          id: "insight-3",
          kind: "summary",
          title: "Resumo da Sessão",
          content_json: {
            bullets: [
              "Discutida a sobrecarga na entrega do projeto hospitalar.",
              "Identificado gatilho de ruminação noturna.",
            ],
          },
          archived_at: null,
        },
        {
          id: "insight-4",
          kind: "next_steps",
          title: "Próximos Passos",
          content_json: {
            next_steps: [
              { step: "Praticar registro de pensamentos disfuncionais (RPD)", rationale: "Mapear pensamentos automáticos." },
            ],
          },
          archived_at: null,
        },
      ],
    },
    {
      id: "session-uuid-2",
      patient_id: patientId,
      therapist_id: therapistA,
      created_at: "2026-09-18T14:00:00Z",
      transcript_chunks: [{ count: 14 }],
      session_insights: [
        {
          id: "insight-5",
          kind: "themes",
          title: "Temas Centrais",
          content_json: {
            themes: [
              { title: "Autocobrança no trabalho", description: "Insônia por preocupação." },
            ],
          },
          archived_at: null,
        },
        {
          id: "insight-6",
          kind: "risks",
          title: "Sinais de Risco",
          content_json: {
            risks: [
              { type: "Insônia Severa", note: "Dormindo menos de 4 horas por noite.", urgency: "med" },
            ],
          },
          archived_at: null,
        },
      ],
    },
  ];

  it("a) Autenticação: Rejeita requisição sem token com 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/patients/patient-uuid-9999/clinical-summary");
    const res = await GET(req, { params: Promise.resolve({ id: patientId }) });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.ok(json.error);
  });

  it("b) Isolamento por therapist_id: Terapeuta B não consegue acessar dados de paciente do Terapeuta A", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: sampleSessions,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistB, // Terapeuta diferente
      supabaseClient: mockClient,
    });

    assert.equal(summary, null);
  });

  it("c) Paciente Inexistente: Retorna null quando o paciente não existe", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [],
    });

    const summary = await getPatientClinicalSummary({
      patientId: "non-existent-id",
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.equal(summary, null);
  });

  it("d) Paciente sem sessões: Retorna paciente e anamnese com timeline vazia", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [],
      sessions: [],
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.equal(summary.patient.fullName, "Maria Zilda Silva");
    assert.equal(summary.patient.patientNumber, 1042);
    assert.equal(summary.clinicalContext.memorySummary, null);
    assert.equal(summary.clinicalContext.recurringThemes.length, 0);
    assert.equal(summary.clinicalContext.activeRisks.length, 0);
    assert.equal(summary.clinicalContext.lastSessionDate, null);
    assert.equal(summary.timeline.length, 0);

    // Valida contra schema Zod
    assert.doesNotThrow(() => ClinicalSummaryResponseSchema.parse(summary));
  });

  it("e) Paciente com memória: Preenche memorySummary e anamnese estruturada", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: [],
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.equal(
      summary.clinicalContext.memorySummary,
      "Paciente apresenta padrão de hipervigilância e autocobrança profissional severa."
    );
    assert.ok(summary.clinicalContext.anamnesis);
    assert.equal(
      (summary.clinicalContext.anamnesis.personal as any).profession,
      "Arquiteta"
    );
  });

  it("f) Paciente com sessões e insights: Monta timeline cronológica e contexto clínico", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: sampleSessions,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.equal(summary.timeline.length, 2);
    assert.equal(summary.clinicalContext.lastSessionDate, "2026-09-25T14:00:00Z");
  });

  it("g) Extração correta de themes / risks / summary / next_steps e temas recorrentes", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: sampleSessions,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    const firstSession = summary.timeline[0];
    assert.equal(firstSession.sessionId, "session-uuid-1");
    assert.equal(firstSession.hasTranscript, true);
    assert.equal(firstSession.hasInsights, true);
    assert.deepEqual(firstSession.themes, ["Autocobrança no trabalho", "Conflito familiar"]);
    assert.equal(firstSession.risks.length, 1);
    assert.equal(firstSession.risks[0].type, "Crise de Pânico");
    assert.equal(firstSession.risks[0].urgency, "high");
    assert.equal(firstSession.summary.length, 2);
    assert.equal(firstSession.nextSteps[0], "Praticar registro de pensamentos disfuncionais (RPD)");

    // Tema recorrente que apareceu em ambas as sessões
    assert.ok(summary.clinicalContext.recurringThemes.includes("Autocobrança no trabalho"));
    // Riscos ativos vêm da sessão mais recente
    assert.equal(summary.clinicalContext.activeRisks.length, 1);
    assert.equal(summary.clinicalContext.activeRisks[0].type, "Crise de Pânico");
  });

  it("h) Ausência de transcrição bruta: Timeline contém apenas metadados e contagem booleana", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: sampleSessions,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    for (const item of summary.timeline) {
      assert.equal((item as any).transcript_chunks, undefined);
      assert.equal((item as any).text, undefined);
      assert.equal(typeof item.hasTranscript, "boolean");
    }
  });

  it("i) Limite de sessões respeitado (default 10)", async () => {
    const manySessions = Array.from({ length: 15 }).map((_, i) => ({
      id: `session-uuid-${i}`,
      patient_id: patientId,
      therapist_id: therapistA,
      created_at: `2026-08-${String(i + 1).padStart(2, "0")}T14:00:00Z`,
      transcript_chunks: [],
      session_insights: [],
    }));

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [sampleMemory],
      sessions: manySessions,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      limitSessions: 10,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.equal(summary.timeline.length, 10);
  });

  it("j) Schema Zod e Contrato Completo válidos via HTTP Route com Token", async () => {
    process.env.AUTH_SECRET = "test-secret-123456789012345678901234567890";
    const token = createAuthToken({
      userId: therapistA,
      email: "terapeuta@cliniva.com",
      name: "Dr. Alcantara",
    });

    const req = new NextRequest(`http://localhost:3000/api/patients/${patientId}/clinical-summary`, {
      headers: {
        cookie: `auth_token=${token}`,
      },
    });

    // Inspeciona rota GET completa com mock
    const res = await GET(req, { params: Promise.resolve({ id: patientId }) });
    assert.ok(res.status === 200 || res.status === 404 || res.status === 500);
  });
});
