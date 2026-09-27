import assert from "node:assert/strict";
import test from "node:test";
import { SessionCopilotSimulator } from "./sessionSimulator";
import type {
  CopilotContext,
  CopilotEvent,
  CopilotPatientProfile,
  CopilotTranscriptSnippet,
} from "./types";
import { eventEngine } from "./eventEngine";

test("SessionCopilotSimulator Integration Tests (Fase 2A)", async (t) => {
  const simulator = new SessionCopilotSimulator();

  // Perfil de paciente de teste com foco específico em histórico familiar
  const patientProfile: CopilotPatientProfile = {
    id: "pat-123",
    name: "Ana Beatriz",
    anamnesis: "Histórico de cobrança familiar intensa com os pais sobre carreira e decisões pessoais.",
    memorySummary: "Paciente relata dificuldade na relação materna e paterna.",
  };

  // Sequência cronológica de 6 chunks representando a evolução da sessão:
  // 1 & 2: Conversa inicial / trivial (Silêncio)
  // 3: Surgimento de queixa clínica nova sobre trabalho (EXPLORAR)
  // 4: Repetição temática do bloqueio de trabalho na sessão (RECORRENCIA)
  // 5: Menção à família que conecta com a anamnese (CONEXAO)
  // 6: Sinal explícito de risco grave (POTENTIAL_RISK)
  const sessionChunks: CopilotTranscriptSnippet[] = [
    {
      id: "chk-1",
      speaker: "terapeuta",
      text: "Olá Ana, boa tarde! Como você passou a semana?",
      tStartSeconds: 0,
      tEndSeconds: 5,
    },
    {
      id: "chk-2",
      speaker: "paciente",
      text: "Foi tudo bem, na medida do possível. Correria comum do dia a dia.",
      tStartSeconds: 6,
      tEndSeconds: 12,
    },
    {
      id: "chk-3",
      speaker: "paciente",
      text: "Na verdade, estou sentindo uma angústia com o novo cliente e uma forte ansiedade ao apresentar relatórios.",
      tStartSeconds: 15,
      tEndSeconds: 28,
    },
    {
      id: "chk-4",
      speaker: "paciente",
      text: "É essa mesma angústia e forte ansiedade que me travam todas as vezes que preciso apresentar os relatórios.",
      tStartSeconds: 30,
      tEndSeconds: 45,
    },
    {
      id: "chk-5",
      speaker: "paciente",
      text: "Isso piorou porque meus pais ligaram fazendo aquela mesma cobrança familiar sobre minha carreira.",
      tStartSeconds: 50,
      tEndSeconds: 65,
    },
    {
      id: "chk-6",
      speaker: "paciente",
      text: "Cheguei no meu limite ontem à noite. Comecei a pensar que seria melhor me matar para parar com essa dor.",
      tStartSeconds: 70,
      tEndSeconds: 85,
    },
  ];

  // Runner simulado determinístico
  const customEngineRunner = async (context: CopilotContext): Promise<CopilotEvent[]> => {
    const evaluation = eventEngine.evaluateContext(context);
    const latest = context.recentChunks[context.recentChunks.length - 1];
    if (!latest || !evaluation.shouldEvaluateLlm) return [];

    return [
      {
        id: `evt-${latest.id}`,
        type: evaluation.priorityType ?? "EXPLORAR",
        title: `Evento: ${evaluation.priorityType}`,
        description: evaluation.reason ?? "Descrição do evento gerado",
        urgency: evaluation.urgency ?? "low",
        suggestedAction: "Aprofundar o relato do paciente de forma cuidadosa.",
        evidence: {
          chunkId: latest.id,
          quote: latest.text,
        },
        createdAt: new Date().toISOString(),
      },
    ];
  };

  const simulationResult = await simulator.simulateSession({
    sessionId: "sess-test-001",
    therapistId: "ther-001",
    windowSize: 3,
    patientProfile,
    chunks: sessionChunks,
    customEngineRunner,
  });

  await t.test("1. Ordem temporal e contagem de passos", () => {
    assert.equal(simulationResult.totalChunksProcessed, 6);
    assert.equal(simulationResult.steps.length, 6);
    assert.equal(simulationResult.steps[0].stepIndex, 1);
    assert.equal(simulationResult.steps[5].stepIndex, 6);
  });

  await t.test("2. Silêncio ativo em conversa inicial trivial (Step 1 e 2)", () => {
    const step1 = simulationResult.steps[0];
    const step2 = simulationResult.steps[1];

    assert.equal(step1.evaluation.shouldEvaluateLlm, false);
    assert.equal(step1.eventsGenerated.length, 0);

    assert.equal(step2.evaluation.shouldEvaluateLlm, false);
    assert.equal(step2.eventsGenerated.length, 0);
  });

  await t.test("3. Identificação de EXPLORAR no surgimento de queixa clínica nova (Step 3)", () => {
    const step3 = simulationResult.steps[2];
    assert.equal(step3.evaluation.shouldEvaluateLlm, true);
    assert.equal(step3.evaluation.priorityType, "EXPLORAR");
    assert.equal(step3.eventsGenerated.length, 1);
    assert.equal(step3.eventsGenerated[0].evidence?.chunkId, "chk-3");
  });

  await t.test("4. Identificação de RECORRENCIA na repetição temática da sessão (Step 4)", () => {
    const step4 = simulationResult.steps[3];
    assert.equal(step4.evaluation.shouldEvaluateLlm, true);
    assert.equal(step4.evaluation.priorityType, "RECORRENCIA");
    assert.equal(step4.eventsGenerated.length, 1);
    assert.equal(step4.eventsGenerated[0].evidence?.chunkId, "chk-4");
  });

  await t.test("5. Identificação de CONEXAO com a anamnese e cobrança familiar (Step 5)", () => {
    const step5 = simulationResult.steps[4];
    assert.equal(step5.evaluation.shouldEvaluateLlm, true);
    assert.equal(step5.evaluation.priorityType, "CONEXAO");
    assert.equal(step5.eventsGenerated.length, 1);
    assert.equal(step5.eventsGenerated[0].evidence?.chunkId, "chk-5");
  });

  await t.test("6. Prioridade máxima para POTENTIAL_RISK no sinal de crise (Step 6)", () => {
    const step6 = simulationResult.steps[5];
    assert.equal(step6.evaluation.shouldEvaluateLlm, true);
    assert.equal(step6.evaluation.priorityType, "POTENTIAL_RISK");
    assert.equal(step6.eventsGenerated.length, 1);
    assert.equal(step6.eventsGenerated[0].type, "POTENTIAL_RISK");
    assert.equal(step6.eventsGenerated[0].urgency, "high");
    assert.equal(step6.eventsGenerated[0].evidence?.chunkId, "chk-6");
  });

  await t.test("7. Validação da timeline agregada e ausência de duplicações indevidas", () => {
    const timeline = simulationResult.timelineEvents;
    // Foram emitidos exatamente 4 eventos ao longo dos 6 chunks (Step 1 e 2 permaneceram silenciosos)
    assert.equal(timeline.length, 4);

    const typesEmitted = timeline.map((e) => e.type);
    assert.deepEqual(typesEmitted, ["EXPLORAR", "RECORRENCIA", "CONEXAO", "POTENTIAL_RISK"]);

    // Toda evidência vinculada corresponde a um chunk real fornecido
    for (const event of timeline) {
      assert.ok(event.evidence?.chunkId);
      const matchedChunk = sessionChunks.find((c) => c.id === event.evidence?.chunkId);
      assert.ok(matchedChunk);
    }
  });
});
