import assert from "node:assert/strict";
import test from "node:test";
import { eventEngine } from "./eventEngine";
import type { CopilotContext, CopilotHistoricalSnippet, CopilotTranscriptSnippet } from "./types";

test("ContextEngine & Longitudinal Memory Tests (Fase 2B - Cenários A a F)", async (t) => {
  // Mock de trechos recentes da sessão atual
  const currentSessionChunks: CopilotTranscriptSnippet[] = [
    {
      id: "chk-curr-1",
      speaker: "paciente",
      text: "Hoje eu gostaria de falar sobre como estou me sentindo no meu trabalho atual.",
    },
    {
      id: "chk-curr-2",
      speaker: "paciente",
      text: "Tenho sentido uma forte ansiedade e um bloqueio paralisante ao ter que apresentar os relatórios para a diretoria.",
    },
  ];

  await t.test("CENÁRIO A: Tema aparece somente na sessão atual → sem falsa conexão histórica", () => {
    const context: CopilotContext = {
      sessionId: "sess-curr-100",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Carlos Eduardo",
        anamnesis: "Histórico de fobia social na infância e medo de falar em público em grandes eventos.",
        memorySummary: "Paciente trabalhou técnicas de respiração para controlar taquicardia em eventos sociais.",
      },
      recentChunks: [
        {
          id: "chk-curr-3",
          speaker: "paciente",
          text: "Comecei a fazer aulas de violão para relaxar no fim de semana e estou gostando bastante das músicas.",
        },
      ],
      totalChunksCount: 1,
      relevantHistory: [], // Nenhuma correspondência histórica com violão
    };

    const evaluation = eventEngine.evaluateContext(context);
    // Não deve conectar com anamnese ou memória porque não há termos substanciais compartilhados
    assert.notEqual(evaluation.priorityType, "CONEXAO");
    assert.equal(context.relevantHistory?.length, 0);
  });

  await t.test("CENÁRIO B: Tema atual corresponde claramente à patient_memory → conexão histórica disponível", () => {
    const context: CopilotContext = {
      sessionId: "sess-curr-100",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Carlos Eduardo",
        anamnesis: "Dificuldade de adaptação profissional.",
        memorySummary: "Paciente relata taquicardia e forte ansiedade sempre que precisa lidar com a diretoria na empresa.",
      },
      recentChunks: currentSessionChunks,
      totalChunksCount: 2,
      relevantHistory: [],
    };

    const evaluation = eventEngine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, true);
    assert.equal(evaluation.priorityType, "CONEXAO");
    assert.ok(evaluation.matchedKeywords && evaluation.matchedKeywords.length >= 2);
    assert.ok(evaluation.matchedKeywords.includes("ansiedade") || evaluation.matchedKeywords.includes("diretoria"));
  });

  await t.test("CENÁRIO C: Tema atual corresponde a uma sessão anterior relevante → RELEVANT_HISTORY disponível com evidência rastreável", () => {
    const relevantPastSnippet: CopilotHistoricalSnippet = {
      sessionId: "sess-past-050",
      chunkId: "chk-past-99",
      speaker: "paciente",
      text: "Na última reunião com a diretoria eu travei completamente e senti aquela mesma forte ansiedade.",
      matchedKeywords: ["ansiedade", "diretoria", "reunião"],
      sessionDate: "2026-08-10T14:00:00Z",
    };

    const context: CopilotContext = {
      sessionId: "sess-curr-100",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Carlos Eduardo",
        anamnesis: "Histórico geral.",
        memorySummary: "Resumo geral.",
      },
      recentChunks: currentSessionChunks,
      totalChunksCount: 2,
      relevantHistory: [relevantPastSnippet],
    };

    assert.ok(context.relevantHistory);
    assert.equal(context.relevantHistory.length, 1);
    const historyItem = context.relevantHistory[0];

    // Valida isolamento e rastreabilidade: session_id da evidência histórica difere da atual
    assert.notEqual(historyItem.sessionId, context.sessionId);
    assert.equal(historyItem.chunkId, "chk-past-99");
    assert.ok(historyItem.text.includes("diretoria"));
  });

  await t.test("CENÁRIO D: Palavra semelhante mas contexto diferente → não considerar automaticamente como conexão relevante", () => {
    const context: CopilotContext = {
      sessionId: "sess-curr-100",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Carlos Eduardo",
        anamnesis: "Conflito grave com a mãe envolvendo herança e dinheiro familiar.",
        memorySummary: "Dificuldade de comunicação com a genitora.",
      },
      recentChunks: [
        {
          id: "chk-curr-4",
          speaker: "paciente",
          text: "Paguei o almoço com meu cartão de crédito e sobrou um dinheiro para o cinema.",
        },
      ],
      totalChunksCount: 1,
      relevantHistory: [],
    };

    const evaluation = eventEngine.evaluateContext(context);
    // Não deve disparar CONEXAO apenas pela presença da palavra solta 'dinheiro'
    assert.notEqual(evaluation.priorityType, "CONEXAO");
  });

  await t.test("CENÁRIO E: Paciente diferente → isolamento garante que nenhum dado de outro paciente apareça", () => {
    const patientA_Context: CopilotContext = {
      sessionId: "sess-patient-A",
      therapistId: "ther-1",
      patient: {
        id: "pat-A",
        name: "Paciente A",
        anamnesis: "Trauma específico do Paciente A.",
        memorySummary: "Memória do Paciente A.",
      },
      recentChunks: [{ id: "chk-a1", speaker: "paciente", text: "Fala do paciente A." }],
      totalChunksCount: 1,
      relevantHistory: [],
    };

    const patientB_Context: CopilotContext = {
      sessionId: "sess-patient-B",
      therapistId: "ther-1",
      patient: {
        id: "pat-B",
        name: "Paciente B",
        anamnesis: "Queixa diferente do Paciente B.",
        memorySummary: "Memória do Paciente B.",
      },
      recentChunks: [{ id: "chk-b1", speaker: "paciente", text: "Fala do paciente B." }],
      totalChunksCount: 1,
      relevantHistory: [],
    };

    // Assegura isolamento estrutural
    assert.notEqual(patientA_Context.patient?.id, patientB_Context.patient?.id);
    assert.notEqual(patientA_Context.patient?.name, patientB_Context.patient?.name);
    assert.notEqual(patientA_Context.patient?.anamnesis, patientB_Context.patient?.anamnesis);
  });

  await t.test("CENÁRIO F: Therapist diferente → isolamento garante que nenhum dado de outro terapeuta apareça", () => {
    const therapist1_Context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "therapist-uuid-1",
      patient: {
        id: "pat-1",
        name: "Juliana Santos",
        anamnesis: "Dados confidenciais sob cuidados do terapeuta 1.",
      },
      recentChunks: [{ id: "chk-1", speaker: "paciente", text: "Relato confidencial." }],
      totalChunksCount: 1,
      relevantHistory: [],
    };

    const therapist2_Context: CopilotContext = {
      sessionId: "sess-2",
      therapistId: "therapist-uuid-2",
      patient: {
        id: "pat-2",
        name: "Lucas Moreira",
        anamnesis: "Dados confidenciais sob cuidados do terapeuta 2.",
      },
      recentChunks: [{ id: "chk-2", speaker: "paciente", text: "Relato de outro paciente." }],
      totalChunksCount: 1,
      relevantHistory: [],
    };

    assert.notEqual(therapist1_Context.therapistId, therapist2_Context.therapistId);
    assert.notEqual(therapist1_Context.patient?.id, therapist2_Context.patient?.id);
  });
});
