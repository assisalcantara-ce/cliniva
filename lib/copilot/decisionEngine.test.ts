import assert from "node:assert/strict";
import test from "node:test";
import { DecisionEngine } from "./decisionEngine";
import type { CopilotContext, CopilotEvent } from "./types";

test("DecisionEngine Clinical Decision & Filtering Tests (Fase 2C)", async (t) => {
  const engine = new DecisionEngine();

  // Contexto base para os testes
  const baseContext: CopilotContext = {
    sessionId: "sess-101",
    therapistId: "ther-101",
    patient: {
      id: "pat-101",
      name: "Mariana Costa",
      anamnesis: "Histórico de fobia social severa e conflito intenso com o pai sobre autonomia profissional.",
      memorySummary: "Paciente relata sensação de sufocamento e crise de choro ao ser confrontada em público.",
    },
    recentChunks: [
      {
        id: "chk-001",
        speaker: "paciente",
        text: "Eu tive uma discussão com meu pai ontem sobre a minha autonomia profissional e senti aquela mesma sensação de sufocamento.",
      },
      {
        id: "chk-002",
        speaker: "paciente",
        text: "Foi horrível, comecei a ter uma crise de choro porque me senti completamente desamparada.",
      },
    ],
    totalChunksCount: 2,
    relevantHistory: [],
  };

  await t.test("A) Contexto rico, mas nenhuma informação com evidência ou relevância útil → []", () => {
    // Evento com descrição vazia ou sem valor clínico
    const candidates: CopilotEvent[] = [
      {
        id: "evt-empty",
        type: "NOTA",
        title: "Nota sem valor",
        description: "Curta",
        urgency: "low",
        evidence: { chunkId: "chk-001", quote: "Eu tive" },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 0);
  });

  await t.test("B) Conexão histórica relevante comprovada → aprova CONEXAO", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-conexao",
        type: "CONEXAO",
        title: "Padrão de Autonomia com o Pai",
        description: "Discussão recente ativa o padrão de conflito com o pai e a sensação de sufocamento registrada na memória clínica.",
        urgency: "medium",
        evidence: {
          chunkId: "chk-001",
          quote: "discussão com meu pai ontem sobre a minha autonomia profissional",
        },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "CONEXAO");
    assert.equal(result[0].id, "evt-conexao");
  });

  await t.test("C) Coincidência lexical sem relação contextual → rejeita e retorna []", () => {
    const trivialContext: CopilotContext = {
      ...baseContext,
      recentChunks: [
        {
          id: "chk-triv",
          speaker: "paciente",
          text: "O pai da minha colega de trabalho comprou um carro novo semana passada.",
        },
      ],
    };

    const candidates: CopilotEvent[] = [
      {
        id: "evt-false-conn",
        type: "CONEXAO",
        title: "Conexão Falsa",
        description: "Mera menção à palavra pai em contexto alheio.",
        urgency: "low",
        evidence: {
          chunkId: "chk-triv",
          quote: "pai da minha colega comprou um carro",
        },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, trivialContext);
    assert.equal(result.length, 0);
  });

  await t.test("D) Recorrência real de padrão entre trechos → aprova RECORRENCIA", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-recorr",
        type: "RECORRENCIA",
        title: "Padrão de Crise de Choro",
        description: "Paciente repete o relato de sensação de sufocamento acompanhado de crise de choro ao longo da sessão.",
        urgency: "medium",
        evidence: {
          chunkId: "chk-002",
          quote: "comecei a ter uma crise de choro porque me senti completamente desamparada",
        },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "RECORRENCIA");
  });

  await t.test("E) Oportunidade concreta de aprofundamento com ação sugerida → aprova EXPLORAR", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-explorar",
        type: "EXPLORAR",
        title: "Sentimento de Desamparo",
        description: "Explorar o significado do desamparo sentido durante a crise de choro recente.",
        urgency: "low",
        suggestedAction: "Pergunte em quais outros momentos da vida a paciente já se sentiu desamparada dessa mesma forma.",
        evidence: {
          chunkId: "chk-002",
          quote: "me senti completamente desamparada",
        },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "EXPLORAR");
    assert.ok(result[0].suggestedAction);
  });

  await t.test("F) Sinal de risco + múltiplos outros eventos → POTENTIAL_RISK recebe prioridade máxima", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-nota",
        type: "NOTA",
        title: "Fato narrado",
        description: "Discussão com o pai sobre trabalho.",
        urgency: "low",
        evidence: { chunkId: "chk-001", quote: "discussão com meu pai" },
        createdAt: "2026-09-26T04:00:00Z",
      },
      {
        id: "evt-risk",
        type: "POTENTIAL_RISK",
        title: "Sinal de Desesperança Grave",
        description: "Menção a pensamentos de autoagressão ou de não querer mais viver.",
        urgency: "high",
        evidence: { chunkId: "chk-002", quote: "me senti completamente desamparada" },
        createdAt: "2026-09-26T04:00:01Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 2);
    assert.equal(result[0].type, "POTENTIAL_RISK");
    assert.equal(result[0].urgency, "high");
  });

  await t.test("G) Múltiplas oportunidades normais → respeita o limite de no máximo 2 eventos normais", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-1",
        type: "CONEXAO",
        title: "Conexão 1",
        description: "Descrição clínica consistente sobre a autonomia com o pai.",
        urgency: "medium",
        evidence: { chunkId: "chk-001", quote: "discussão com meu pai ontem sobre a minha autonomia profissional" },
        createdAt: "2026-09-26T04:00:00Z",
      },
      {
        id: "evt-2",
        type: "RECORRENCIA",
        title: "Recorrência 1",
        description: "Descrição clínica consistente sobre o padrão de choro e sufocamento.",
        urgency: "medium",
        evidence: { chunkId: "chk-002", quote: "crise de choro porque me senti completamente desamparada" },
        createdAt: "2026-09-26T04:00:01Z",
      },
      {
        id: "evt-3",
        type: "EXPLORAR",
        title: "Explorar 1",
        description: "Descrição consistente sobre desamparo.",
        suggestedAction: "Aprofundar a sensação de desamparo.",
        urgency: "low",
        evidence: { chunkId: "chk-002", quote: "me senti completamente desamparada" },
        createdAt: "2026-09-26T04:00:02Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    // Deve limitar rigorosamente a no máximo 2 eventos normais
    assert.equal(result.length, 2);
    assert.equal(result[0].type, "CONEXAO");
    assert.equal(result[1].type, "RECORRENCIA");
  });

  await t.test("H) Evento sem evidência ou com citação inventada/inexistente → rejeitado", () => {
    const candidates: CopilotEvent[] = [
      {
        id: "evt-hallucinated",
        type: "EXPLORAR",
        title: "Alucinação Sem Evidência",
        description: "Sugestão baseada em algo que não existe no contexto.",
        urgency: "low",
        suggestedAction: "Pergunte sobre a viagem de férias que o paciente fez para a praia.",
        evidence: {
          chunkId: "chk-fake-99",
          quote: "Viajei para a praia semana passada e nadei no mar.",
        },
        createdAt: "2026-09-26T04:00:00Z",
      },
    ];

    const result = engine.filterAndDecideEvents(candidates, baseContext);
    assert.equal(result.length, 0);
  });
});
