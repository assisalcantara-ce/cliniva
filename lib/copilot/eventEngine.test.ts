import assert from "node:assert/strict";
import test from "node:test";
import { EventEngine } from "./eventEngine";
import type { CopilotContext, CopilotEvent } from "./types";

test("EventEngine Unit Tests (Fase 1C - Seletividade Clínica e Deduplicação)", async (t) => {
  const engine = new EventEngine();

  await t.test("1. Palavra isolada ou texto muito curto sem contexto → nenhum evento", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      totalChunksCount: 1,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Trabalho." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, false);
    assert.match(evaluation.reason ?? "", /insuficiente|curto/i);
  });

  await t.test("2. Texto sem relevância clínica (conversa cotidiana trivial) → nenhum evento", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      totalChunksCount: 2,
      recentChunks: [
        { id: "chk-1", speaker: "terapeuta", text: "Boa tarde, tudo bem por aí hoje?" },
        { id: "chk-2", speaker: "paciente", text: "Boa tarde, tudo tranquilo, só o trânsito que estava um pouco cheio." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, false);
    assert.match(evaluation.reason ?? "", /sem ponto crítico|andamento/i);
  });

  await t.test("3. Contexto com angústia/conflito relevante → aciona EXPLORAR", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      totalChunksCount: 3,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Eu sinto uma ansiedade imensa sempre que preciso falar na reunião de equipe." },
        { id: "chk-2", speaker: "terapeuta", text: "Como essa ansiedade se manifesta fisicamente?" },
        { id: "chk-3", speaker: "paciente", text: "Começo a suar frio, sinto um aperto no peito e um medo constante de ser julgado." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, true);
    assert.equal(evaluation.priorityType, "EXPLORAR");
    assert.equal(evaluation.urgency, "low");
  });

  await t.test("4. Risco novo com sinal claro → POTENTIAL_RISK com urgência alta e prioridade máxima", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      totalChunksCount: 4,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Não vejo mais sentido em continuar me esforçando." },
        { id: "chk-2", speaker: "paciente", text: "Tenho pensado seriamente em me matar para acabar com tudo isso." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, true);
    assert.equal(evaluation.priorityType, "POTENTIAL_RISK");
    assert.equal(evaluation.urgency, "high");
    assert.ok(evaluation.matchedKeywords && evaluation.matchedKeywords.length > 0);
  });

  await t.test("5. Conexão apenas lexical (1 palavra solta) → NÃO gera CONEXAO", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Maria",
        anamnesis: "Histórico de relacionamento abusivo com o ex-marido envolvendo controle financeiro e agressão verbal.",
        memorySummary: "Paciente em processo de reconstrução de autonomia financeira e autoestima.",
      },
      totalChunksCount: 3,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Fui ao supermercado hoje e comprei algumas coisas normais para a semana." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    // Não deve acusar conexão com a anamnese só porque compartilham palavras irrelevantes
    assert.notEqual(evaluation.priorityType, "CONEXAO");
  });

  await t.test("6. Conexão contextual real (múltiplos termos e tema compatível) → CONEXAO", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      patient: {
        id: "pat-1",
        name: "Maria",
        anamnesis: "Histórico de relacionamento abusivo com o ex-marido envolvendo controle financeiro e agressão verbal.",
        memorySummary: "Paciente em processo de reconstrução de autonomia financeira e autoestima.",
      },
      totalChunksCount: 4,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Ele tentou me controlar novamente ontem pelo telefone." },
        { id: "chk-2", speaker: "paciente", text: "Meu ex-marido começou com agressões verbais dizendo que eu não teria autonomia financeira sem ele." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, true);
    assert.equal(evaluation.priorityType, "CONEXAO");
    assert.equal(evaluation.urgency, "medium");
    assert.ok(evaluation.matchedKeywords && evaluation.matchedKeywords.length >= 2);
  });

  await t.test("7. Recorrência real de padrão dentro da sessão → RECORRENCIA", () => {
    const context: CopilotContext = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      totalChunksCount: 5,
      recentChunks: [
        { id: "chk-1", speaker: "paciente", text: "Eu sinto um bloqueio paralisante sempre que tento expressar minha opinião." },
        { id: "chk-2", speaker: "terapeuta", text: "Em quais situações isso mais acontece?" },
        { id: "chk-3", speaker: "paciente", text: "Ontem com meus amigos tive exatamente esse mesmo bloqueio paralisante." },
      ],
    };

    const evaluation = engine.evaluateContext(context);
    assert.equal(evaluation.shouldEvaluateLlm, true);
    assert.equal(evaluation.priorityType, "RECORRENCIA");
    assert.equal(evaluation.urgency, "medium");
    assert.ok(evaluation.matchedKeywords && evaluation.matchedKeywords.length >= 2);
  });

  await t.test("8. Deduplicação: mesma evidência/título repetido → não duplica eventos", () => {
    const duplicateEvents: CopilotEvent[] = [
      {
        id: "evt-1",
        type: "EXPLORAR",
        title: "Sentimento de Culpa",
        description: "Explorar a culpa sentida no trabalho.",
        urgency: "low",
        evidence: { chunkId: "chk-1", quote: "Sinto muita culpa no trabalho" },
        createdAt: "2026-09-26T04:00:00.000Z",
      },
      {
        id: "evt-2",
        type: "EXPLORAR",
        title: "Sentimento de Culpa",
        description: "Aprofundar a culpa profissional.",
        urgency: "low",
        evidence: { chunkId: "chk-1", quote: "Sinto muita culpa no trabalho" },
        createdAt: "2026-09-26T04:00:01.000Z",
      },
    ];

    const deduplicated = engine.deduplicateAndRankEvents(duplicateEvents, 3);
    assert.equal(deduplicated.length, 1);
    assert.equal(deduplicated[0].id, "evt-1");
  });

  await t.test("9. Prioridade e Risco: POTENTIAL_RISK tem precedência sobre outros eventos e não é descartado", () => {
    const mixedEvents: CopilotEvent[] = [
      {
        id: "evt-nota",
        type: "NOTA",
        title: "Mudança de endereço",
        description: "Paciente mudou de casa.",
        urgency: "low",
        createdAt: "2026-09-26T04:00:00.000Z",
      },
      {
        id: "evt-risk",
        type: "POTENTIAL_RISK",
        title: "Sinal de automutilação",
        description: "Menção a impulsos de se cortar.",
        urgency: "high",
        evidence: { chunkId: "chk-2", quote: "Pensei em me cortar" },
        createdAt: "2026-09-26T04:00:01.000Z",
      },
      {
        id: "evt-explorar",
        type: "EXPLORAR",
        title: "Conflito com o chefe",
        description: "Explorar atrito profissional.",
        urgency: "medium",
        createdAt: "2026-09-26T04:00:02.000Z",
      },
    ];

    const ranked = engine.deduplicateAndRankEvents(mixedEvents, 3);
    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].type, "POTENTIAL_RISK");
    assert.equal(ranked[1].type, "EXPLORAR");
    assert.equal(ranked[2].type, "NOTA");
  });

  await t.test("10. Dois sinais diferentes justificáveis → mantém eventos distintos", () => {
    const distinctEvents: CopilotEvent[] = [
      {
        id: "evt-1",
        type: "CONEXAO",
        title: "Padrão Materno",
        description: "Conexão com conflito infantil.",
        urgency: "medium",
        evidence: { chunkId: "chk-1", quote: "Minha mãe me ligou" },
        createdAt: "2026-09-26T04:00:00.000Z",
      },
      {
        id: "evt-2",
        type: "EXPLORAR",
        title: "Sobrecarga no Trabalho",
        description: "Dificuldade com novos prazos.",
        urgency: "low",
        evidence: { chunkId: "chk-2", quote: "Muitos prazos na empresa" },
        createdAt: "2026-09-26T04:00:01.000Z",
      },
    ];

    const result = engine.deduplicateAndRankEvents(distinctEvents, 3);
    assert.equal(result.length, 2);
  });
});
