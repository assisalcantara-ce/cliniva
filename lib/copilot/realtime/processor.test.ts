import assert from "node:assert/strict";
import test from "node:test";
import { RealtimeCopilotProcessor } from "./processor";
import type { CopilotContext, CopilotEvent, CopilotPatientProfile } from "../types";
import { eventEngine } from "../eventEngine";

test("RealtimeCopilotProcessor Unit & Integration Tests (Fase 3A - Cenários A a I)", async (t) => {
  const patientProfile: CopilotPatientProfile = {
    id: "pat-realtime-1",
    name: "Helena Ramos",
    anamnesis: "Histórico de ansiedade generalizada com cobrança materna rígida sobre desempenho acadêmico.",
    memorySummary: "Paciente relata sensação de sufocamento e crise de choro ao ser criticada pela família.",
  };

  // Runner determinístico para simulação de inferência em testes
  const deterministicRunner = async (context: CopilotContext): Promise<CopilotEvent[]> => {
    const evaluation = eventEngine.evaluateContext(context);
    const latest = context.recentChunks[context.recentChunks.length - 1];
    if (!latest || !evaluation.shouldEvaluateLlm) return [];

    return [
      {
        id: `evt-${latest.id}`,
        type: evaluation.priorityType ?? "EXPLORAR",
        title: `Evento ${evaluation.priorityType}: ${evaluation.matchedKeywords?.join(" ") ?? "clínico"}`,
        description: evaluation.reason ?? "Descrição do evento gerado com detalhamento clínico.",
        urgency: evaluation.urgency ?? "medium",
        suggestedAction: "Aprofundar o relato do paciente de forma acolhedora.",
        evidence: {
          chunkId: latest.id,
          quote: latest.text,
        },
        createdAt: new Date().toISOString(),
      },
    ];
  };

  await t.test("A) Primeiro chunk trivial → nenhum evento (Silêncio Ativo)", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    const result = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-1",
        speaker: "paciente",
        text: "Boa tarde, doutor. Tudo bem?",
        timestamp: 1000,
        sequenceNumber: 1,
      },
    });

    assert.equal(result.newEvents.length, 0);
    assert.equal(result.processedChunksCount, 1);
    assert.equal(result.totalEventsEmittedCount, 0);
  });

  await t.test("B) Novo tema relevante com marcador de afeto → gera EXPLORAR", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    const result = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-2",
        speaker: "paciente",
        text: "Eu tenho sentido uma forte ansiedade e um medo constante com meu projeto novo.",
        timestamp: 2000,
        sequenceNumber: 1,
      },
    });

    assert.equal(result.newEvents.length, 1);
    assert.equal(result.newEvents[0].type, "EXPLORAR");
    assert.equal(result.newEvents[0].evidence?.chunkId, "chk-2");
  });

  await t.test("C) Repetição posterior do padrão na sessão → gera RECORRENCIA", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    // Passo 1: Tema inicial
    await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-a",
        speaker: "paciente",
        text: "Sinto uma angústia com o novo trabalho e uma forte ansiedade ao falar.",
        timestamp: 1000,
        sequenceNumber: 1,
      },
    });

    // Passo 2: Repetição do tema
    const result = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-b",
        speaker: "paciente",
        text: "É essa mesma angústia e forte ansiedade que me travam todas as vezes.",
        timestamp: 2000,
        sequenceNumber: 2,
      },
    });

    assert.equal(result.newEvents.length, 1);
    assert.equal(result.newEvents[0].type, "RECORRENCIA");
  });

  await t.test("D) Conexão com memória/anamnese → gera CONEXAO", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    const result = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-conn",
        speaker: "paciente",
        text: "Eu sinto uma forte ansiedade e muita angústia pela cobrança materna rígida e contínua.",
        timestamp: 1000,
        sequenceNumber: 1,
      },
    });

    assert.equal(result.newEvents.length, 1);
    assert.equal(result.newEvents[0].type, "CONEXAO");
  });

  await t.test("E) Evento idêntico já emitido na sessão → não duplicar", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    const chunkData = {
      id: "chk-dup",
      speaker: "paciente",
      text: "Sinto muita angústia e forte ansiedade todos os dias.",
      timestamp: 1000,
      sequenceNumber: 1,
    };

    // Primeira emissão
    const res1 = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: chunkData,
    });
    assert.equal(res1.newEvents.length, 1);

    // Tentativa com mesma evidência e evento idêntico
    const res2 = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        ...chunkData,
        id: "chk-dup-2",
        timestamp: 2000,
        sequenceNumber: 2,
      },
    });

    // Evento duplicado deve ser suprimido
    assert.equal(res2.newEvents.length, 0);
    assert.ok(res2.suppressedEventsCount >= 1);
  });

  await t.test("F) Novo POTENTIAL_RISK → sempre retornar com urgência alta", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    const result = await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-risk",
        speaker: "paciente",
        text: "Cheguei no limite e estou pensando seriamente em me matar.",
        timestamp: 1000,
        sequenceNumber: 1,
      },
    });

    assert.equal(result.newEvents.length, 1);
    assert.equal(result.newEvents[0].type, "POTENTIAL_RISK");
    assert.equal(result.newEvents[0].urgency, "high");
  });

  await t.test("G) Chunks fora de ordem temporal ou de sequência → rejeitar de forma segura", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-001",
      therapistId: "ther-001",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    await processor.processChunk({
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunk: {
        id: "chk-seq-10",
        speaker: "paciente",
        text: "Primeiro trecho recebido.",
        timestamp: 5000,
        sequenceNumber: 10,
      },
    });

    // Chunk com sequenceNumber anterior deve ser rejeitado
    await assert.rejects(
      async () => {
        await processor.processChunk({
          sessionId: "sess-001",
          therapistId: "ther-001",
          chunk: {
            id: "chk-seq-5",
            speaker: "paciente",
            text: "Trecho atrasado fora de ordem.",
            timestamp: 4000,
            sequenceNumber: 5,
          },
        });
      },
      /fora de ordem/i
    );
  });

  await t.test("H) Inconsistência de sessionId ou therapistId → rejeitar imediatamente", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-correct",
      therapistId: "ther-correct",
      patientId: "pat-correct",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    // Tentativa de enviar chunk para outro therapistId
    await assert.rejects(
      async () => {
        await processor.processChunk({
          sessionId: "sess-correct",
          therapistId: "ther-WRONG",
          chunk: {
            id: "chk-err",
            speaker: "paciente",
            text: "Tentativa de injeção de outro terapeuta.",
          },
        });
      },
      /Inconsistência de isolamento/i
    );
  });

  await t.test("I) Múltiplos chunks sequenciais → mantém contagem e estado incremental corretamente", async () => {
    const processor = new RealtimeCopilotProcessor({
      sessionId: "sess-multi",
      therapistId: "ther-multi",
      patientProfile,
      customEngineRunner: deterministicRunner,
    });

    for (let i = 1; i <= 5; i++) {
      await processor.processChunk({
        sessionId: "sess-multi",
        therapistId: "ther-multi",
        chunk: {
          id: `chk-${i}`,
          speaker: "paciente",
          text: `Trecho de fala número ${i}.`,
          timestamp: i * 1000,
          sequenceNumber: i,
        },
      });
    }

    assert.equal(processor.getProcessedChunksCount(), 5);
  });
});
