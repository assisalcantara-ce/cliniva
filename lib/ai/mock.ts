import "server-only";

import { z } from "zod";

type TranscriptChunk = {
  id: string;
  speaker?: string | null;
  text: string;
};

function clipQuote(text: string, max = 220): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function pickPrimaryChunk(chunks: TranscriptChunk[]): TranscriptChunk {
  const nonEmpty = chunks.find((c) => c.text.trim().length > 0);
  return nonEmpty ?? chunks[0];
}

function detectFlags(text: string): { selfHarm: boolean; violence: boolean } {
  const t = text.toLowerCase();
  const selfHarm = /(suicid|tirar a (pr[oó]pria )?vida|me matar|matar[- ]me|autoagress)/.test(
    t,
  );
  const violence = /(matar algu[eé]m|amea[çc]a|viol[eê]ncia|agress[aã]o)/.test(t);
  return { selfHarm, violence };
}

export function generateMockInsightsFromTranscript(params: {
  chunks: TranscriptChunk[];
}): { candidate: unknown; inputModerationFlagged: boolean } {
  const primary = pickPrimaryChunk(params.chunks);
  const allText = params.chunks.map((c) => c.text).join("\n");
  const flags = detectFlags(allText);

  const baseEvidence = [{ chunk_id: primary.id, quote: clipQuote(primary.text) }];

  const themes = [
    {
      title: "Cansaço e desgaste",
      description:
        "Pode sugerir exaustão emocional/física e baixa energia; vale explorar rotina, sono, sobrecarga e fatores de estresse.",
      evidence: baseEvidence,
    },
    {
      title: "Direção e sentido",
      description:
        "Pode indicar dificuldade de estabelecer metas ou senso de propósito; explorar valores, prioridades e pequenos passos concretos.",
      evidence: baseEvidence,
    },
  ];

  const questions = [
    {
      question:
        "Quando você diz que está sem direção, como isso aparece no seu dia a dia (trabalho, relacionamentos, autocuidado)?",
      rationale:
        "Ajuda a transformar um tema amplo em exemplos observáveis e identificar áreas prioritárias.",
      evidence: baseEvidence,
    },
    {
      question:
        "Esse cansaço é mais físico, mental ou emocional? O que muda nos dias em que ele piora ou melhora?",
      rationale:
        "Distingue padrões e possíveis gatilhos/atenuantes sem assumir uma causa.",
      evidence: baseEvidence,
    },
    {
      question:
        "Se você tivesse 5% mais clareza esta semana, qual seria um pequeno passo que faria sentido tentar?",
      rationale:
        "Convida para experimentos pequenos e mensuráveis, compatíveis com um MVP de acompanhamento.",
      evidence: baseEvidence,
    },
  ];

  const hypotheses = [
    {
      hypothesis:
        "Pode haver um ciclo de desânimo/evitação: falta de direção → menor ação → mais frustração/cansaço.",
      confidence: "low",
      evidence: baseEvidence,
    },
    {
      hypothesis:
        "Pode haver sobrecarga (externa ou interna) contribuindo para a sensação de exaustão e desorganização de metas.",
      confidence: "low",
      evidence: baseEvidence,
    },
  ];

  const risks = flags.selfHarm
    ? [
        {
          type: "autoagressão",
          note:
            "Sinais potenciais de risco; recomenda-se checagem direta de segurança e plano de suporte conforme protocolo local.",
          urgency: "high",
          evidence: baseEvidence,
        },
      ]
    : flags.violence
      ? [
          {
            type: "violência",
            note:
              "Sinais potenciais de risco; recomenda-se checagem de segurança e encaminhamento conforme protocolo local.",
            urgency: "high",
            evidence: baseEvidence,
          },
        ]
      : [];

  const summary = {
    bullets: [
      "Relato de cansaço persistente.",
      "Relato de falta de direção/sentido.",
      "Foco inicial: mapear padrões, gatilhos e pequenos passos.",
    ],
  };

  const next_steps = [
    {
      step: "Mapear 1–2 situações recentes com mais detalhe",
      rationale: "Registrar contexto, pensamentos, emoções e comportamento para identificar padrões.",
    },
    {
      step: "Definir um experimento pequeno para a semana",
      rationale: "Testar um passo viável e revisar o resultado na próxima sessão.",
    },
  ];

  const suggested_next_steps = [
    {
      action: "Explorar as situações mencionadas com mais profundidade",
      rationale: "Pode revelar padrões recorrentes relevantes para o processo terapêutico.",
      type: "exploration" as const,
    },
  ];

  const candidate: unknown = {
    themes,
    questions,
    hypotheses,
    risks,
    summary,
    next_steps,
    suggested_next_steps,
  };

  return { candidate, inputModerationFlagged: flags.selfHarm || flags.violence };
}

export const AI_PROVIDER_SCHEMA = z.enum(["openai", "mock"]);

export function getAiProvider(): "openai" | "mock" {
  const raw = process.env.AI_PROVIDER;
  const parsed = AI_PROVIDER_SCHEMA.safeParse(raw);
  return parsed.success ? parsed.data : "openai";
}
