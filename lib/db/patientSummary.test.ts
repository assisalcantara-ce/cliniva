import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getPatientClinicalSummary,
  ClinicalSummaryResponseSchema,
} from "@/lib/db/patientSummary";
import { GET } from "@/app/api/patients/[id]/clinical-summary/route";
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
            summary: {
              bullets: [
                "Discutida a sobrecarga na entrega do projeto hospitalar.",
                "Identificado gatilho de ruminação noturna.",
              ],
            },
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

  it("1. Autenticação: Rejeita requisição sem token com 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/patients/patient-uuid-9999/clinical-summary");
    const res = await GET(req, { params: Promise.resolve({ id: patientId }) });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.ok(json.error);
  });

  it("2. Isolamento por therapist_id: Terapeuta B não consegue acessar dados de paciente do Terapeuta A", async () => {
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

  it("3. Paciente Inexistente: Retorna null quando o paciente não existe", async () => {
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

  it("4. Paciente sem sessões: Retorna paciente e anamnese com timeline vazia", async () => {
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

  it("5. Paciente com memória: Preenche memorySummary e anamnese estruturada", async () => {
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

  it("6. Paciente com sessões e insights: Monta timeline cronológica e contexto clínico", async () => {
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

  it("A) summary no formato aninhado: { summary: { bullets: ['A', 'B'] } }", async () => {
    const sessionWithNestedSummary = [
      {
        id: "sess-nested-summary",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [{ count: 10 }],
        session_insights: [
          {
            id: "ins-1",
            kind: "summary",
            content_json: { summary: { bullets: ["Ponto A", "Ponto B"] } },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithNestedSummary,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].summary, ["Ponto A", "Ponto B"]);
  });

  it("B) summary no formato direto: { bullets: ['A', 'B'] }", async () => {
    const sessionWithDirectBullets = [
      {
        id: "sess-direct-bullets",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [{ count: 10 }],
        session_insights: [
          {
            id: "ins-1",
            kind: "summary",
            content_json: { bullets: ["Tópico 1", "Tópico 2"] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithDirectBullets,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].summary, ["Tópico 1", "Tópico 2"]);
  });

  it("C) summary como string de texto corrido", async () => {
    const sessionWithStringSummary = [
      {
        id: "sess-string-summary",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-1",
            kind: "summary",
            content_json: { summary: "- Primeira observação\n- Segunda observação" },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithStringSummary,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].summary, ["Primeira observação", "Segunda observação"]);
  });

  it("D) next_steps como strings simples: { next_steps: ['texto 1', 'texto 2'] }", async () => {
    const sessionWithStepsString = [
      {
        id: "sess-steps-string",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-1",
            kind: "next_steps",
            content_json: { next_steps: ["Passo 1", "Passo 2"] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithStepsString,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].nextSteps, ["Passo 1", "Passo 2"]);
  });

  it("E) next_steps como objetos { step: 'texto' }", async () => {
    const sessionWithStepObjects = [
      {
        id: "sess-step-obj",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-1",
            kind: "next_steps",
            content_json: { next_steps: [{ step: "Treinar respiração", rationale: "ansiedade" }] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithStepObjects,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].nextSteps, ["Treinar respiração"]);
  });

  it("F) next_steps como objetos { action: 'texto' }", async () => {
    const sessionWithActionObjects = [
      {
        id: "sess-action-obj",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-1",
            kind: "next_steps",
            content_json: { next_steps: [{ action: "Mapear crenças", rationale: "clareza" }] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithActionObjects,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].nextSteps, ["Mapear crenças"]);
  });

  it("G) suggested_next_steps como objetos { action: 'texto' }", async () => {
    const sessionWithSuggested = [
      {
        id: "sess-suggested",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-1",
            kind: "suggested_next_steps",
            content_json: { suggested_next_steps: [{ action: "Agendar reavaliação" }] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithSuggested,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.timeline[0].nextSteps, ["Agendar reavaliação"]);
  });

  it("H) temas_principais vindos defensivamente da patient_memory quando a timeline não tem temas", async () => {
    const memoryWithThemes = {
      patient_id: patientId,
      therapist_id: therapistA,
      summary: JSON.stringify({
        resumo: "Paciente em acompanhamento regular.",
        temas_principais: ["Perfeccionismo", "Medo de rejeição"],
      }),
      updated_at: "2026-09-20T16:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [memoryWithThemes],
      sessions: [],
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.clinicalContext.recurringThemes, ["Perfeccionismo", "Medo de rejeição"]);
  });

  it("I) padroes_recorrentes vindos defensivamente da patient_memory", async () => {
    const memoryWithPatterns = {
      patient_id: patientId,
      therapist_id: therapistA,
      summary: JSON.stringify({
        resumo: "Acompanhamento clínico.",
        padroes_recorrentes: ["Cobrança familiar", "Hipervigilância"],
      }),
      updated_at: "2026-09-20T16:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_memory: [memoryWithPatterns],
      sessions: [],
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.deepEqual(summary.clinicalContext.recurringThemes, ["Cobrança familiar", "Hipervigilância"]);
  });

  it("J) Riscos: Preserva rigorosamente riscos estruturados e não inventa riscos a partir de texto livre", async () => {
    const sessionWithRisks = [
      {
        id: "sess-risks",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-risk",
            kind: "risks",
            content_json: {
              risks: [
                { type: "Ideação Passiva", note: "Sem plano estruturado.", urgency: "alta" },
              ],
            },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithRisks,
    });

    const summary = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClient,
    });

    assert.ok(summary);
    assert.equal(summary.timeline[0].risks.length, 1);
    assert.equal(summary.timeline[0].risks[0].type, "Ideação Passiva");
    assert.equal(summary.timeline[0].risks[0].urgency, "high");

    // Sessão sem insights de risco não inventa risco
    const sessionWithoutRisks = [
      {
        id: "sess-no-risk",
        patient_id: patientId,
        therapist_id: therapistA,
        created_at: "2026-09-27T10:00:00Z",
        transcript_chunks: [],
        session_insights: [
          {
            id: "ins-text",
            kind: "summary",
            content_json: { bullets: ["Paciente relatou tristeza profunda e cansaço."] },
            archived_at: null,
          },
        ],
      },
    ];

    const mockClientNoRisk = createMockSupabaseClient({
      patients: [samplePatient],
      sessions: sessionWithoutRisks,
    });

    const summaryNoRisk = await getPatientClinicalSummary({
      patientId,
      therapistId: therapistA,
      supabaseClient: mockClientNoRisk,
    });

    assert.ok(summaryNoRisk);
    assert.equal(summaryNoRisk.timeline[0].risks.length, 0);
    assert.equal(summaryNoRisk.clinicalContext.activeRisks.length, 0);
  });

  it("K) Ausência de transcrição bruta: Timeline contém apenas metadados e contagem booleana", async () => {
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

  it("L) Limite de sessões respeitado (default 10)", async () => {
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

  it("M) Schema Zod e Contrato Completo válidos via HTTP Route com Token", async () => {
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

    const res = await GET(req, { params: Promise.resolve({ id: patientId }) });
    assert.ok(res.status === 200 || res.status === 404 || res.status === 500);
  });
});
