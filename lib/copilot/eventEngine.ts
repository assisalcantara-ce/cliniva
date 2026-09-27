import type { CopilotContext, CopilotEvent, CopilotEventType, CopilotEventUrgency } from "./types";

/**
 * Interface do avaliador de gatilhos do Event Engine.
 */
export interface EventTriggerEvaluation {
  shouldEvaluateLlm: boolean;
  priorityType?: CopilotEventType;
  urgency?: CopilotEventUrgency;
  reason?: string;
  matchedKeywords?: string[];
  candidateEvidence?: {
    chunkId: string;
    quote: string;
  };
}

/**
 * Padrões lexicais de alerta imediato (prioridade alta de segurança).
 */
const RISK_KEYWORDS = [
  "suicid",
  "me matar",
  "tirar minha vida",
  "acabar com tudo",
  "me cortar",
  "automutila",
  "agressao",
  "apanh",
  "abuso",
  "overdose",
];

/**
 * Marcadores de exploração clínica genuína (gatilhos de conflito, ambivalência, emoção intensa).
 */
const CLINICAL_EXPLORATION_MARKERS = [
  "angustia", "ansied", "medo", "trauma", "panico", "crise", "deprim",
  "culpa", "vergonha", "vazio", "solidao", "desespero", "impasse", "bloque",
  "dificuldade", "conflito", "frustra", "raiva", "choro", "tristeza", "cansaco",
  "nao sei o que fazer", "nao consigo", "pesadelo", "insonia", "pressao", "sufoc"
];

/**
 * Palavras stop-words em português para filtrar na extração de termos chave.
 */
const COMMON_STOP_WORDS = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com", "não",
  "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como", "mas", "foi",
  "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser", "quando", "muito",
  "nos", "já", "eu", "também", "só", "pelo", "pela", "até", "isso", "ela", "entre",
  "era", "depois", "sem", "mesmo", "aos", "ter", "seus", "quem", "nas", "me", "esse",
  "eles", "estão", "você", "tinha", "foram", "essa", "num", "nem", "suas", "meu",
  "minha", "têm", "numa", "pelos", "elas", "havia", "seja", "qual", "será", "nós",
  "tenho", "estou", "estava", "porque", "sobre", "tudo", "nada", "aqui", "agora",
  "entao", "assim", "onde", "qual", "coisa", "onde", "hoje", "ontem", "amanha",
  "dias", "anos", "vezes", "pouco", "bem", "bom", "boa", "tudo", "todo", "toda"
]);

/**
 * Hierarquia de prioridade estrita do Copilot 2.0:
 * POTENTIAL_RISK > CONEXAO/RECORRENCIA > ACOMPANHAR > EXPLORAR > NOTA
 */
export const EVENT_TYPE_PRIORITY: Record<CopilotEventType, number> = {
  POTENTIAL_RISK: 5,
  CONEXAO: 4,
  RECORRENCIA: 4,
  ACOMPANHAR: 3,
  EXPLORAR: 2,
  NOTA: 1,
};

function extractSignificantKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !COMMON_STOP_WORDS.has(w));
}

/**
 * Normaliza strings para cálculo de similaridade contextual.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Motor de eventos clínicos (Event Engine) — Fase 1C (Alta Seletividade Clínica).
 * Responsável por:
 * 1. Filtragem rigorosa de ruído e conversas triviais.
 * 2. Detecção conservadora e prioritária de POTENTIAL_RISK (sem diagnósticos).
 * 3. Identificação de CONEXAO contextual com anamnese/memória (rejeitando mera coincidência de 1 palavra).
 * 4. Identificação de RECORRENCIA genuína de padrões/temas na sessão ou histórico.
 * 5. Identificação de EXPLORAR apenas em oportunidades clínicas concretas.
 * 6. Deduplicação semântica e limitação de volume por janela.
 */
export class EventEngine {
  /**
   * Avalia o contexto recente para decidir se há relevância clínica e determinar o tipo prioritário.
   */
  public evaluateContext(context: CopilotContext): EventTriggerEvaluation {
    const { recentChunks, patient } = context;

    if (!recentChunks || recentChunks.length === 0) {
      return {
        shouldEvaluateLlm: false,
        reason: "Nenhum trecho recente fornecido.",
      };
    }

    const latestChunk = recentChunks[recentChunks.length - 1];
    const latestRawText = (latestChunk?.text ?? "").trim();
    const latestNormalized = normalizeText(latestRawText);

    // 1. Filtro de ruído inicial: trechos muito curtos ou sem densidade semântica
    if (latestRawText.length < 15 || latestNormalized.split(" ").length < 3) {
      // Exceção apenas se houver keyword explícita de risco
      const hasRisk = RISK_KEYWORDS.some((kw) => latestNormalized.includes(kw));
      if (!hasRisk) {
        return {
          shouldEvaluateLlm: false,
          reason: "Texto isolado ou muito curto sem valor clínico suficiente.",
        };
      }
    }

    // 2. PRIORIDADE MÁXIMA: POTENTIAL_RISK (Detecção conservadora de segurança)
    const matchedRisk = RISK_KEYWORDS.filter((kw) => latestNormalized.includes(kw));
    if (matchedRisk.length > 0) {
      return {
        shouldEvaluateLlm: true,
        priorityType: "POTENTIAL_RISK",
        urgency: "high",
        reason: "Sinal textual de risco identificado no trecho recente.",
        matchedKeywords: matchedRisk,
        candidateEvidence: {
          chunkId: latestChunk.id,
          quote: latestRawText.slice(0, 160),
        },
      };
    }

    const latestSignificant = extractSignificantKeywords(latestRawText);

    // 3. CONEXAO: Exige correspondência contextual real com a anamnese ou memória
    // Não considera 1 palavra isolada como conexão suficiente (exige ao menos 2 termos temáticos ou frase-chave)
    if (patient && latestSignificant.length >= 2) {
      const anamnesisNorm = normalizeText(patient.anamnesis ?? "");
      const memoryNorm = normalizeText(patient.memorySummary ?? "");
      const historicalSource = `${anamnesisNorm} ${memoryNorm}`;

      const matchedHistorical = latestSignificant.filter((kw) =>
        historicalSource.includes(kw)
      );

      // Critério seletivo: precisa de ao menos 2 termos substanciais compartilhados
      if (matchedHistorical.length >= 2) {
        return {
          shouldEvaluateLlm: true,
          priorityType: "CONEXAO",
          urgency: "medium",
          reason: `Correspondência contextual com o histórico/anamnese: ${matchedHistorical.join(", ")}`,
          matchedKeywords: matchedHistorical,
          candidateEvidence: {
            chunkId: latestChunk.id,
            quote: latestRawText.slice(0, 160),
          },
        };
      }
    }

    // 4. RECORRENCIA: Repetição real de padrão ou tema dentro dos chunks anteriores da sessão
    if (recentChunks.length > 1 && latestSignificant.length >= 2) {
      const previousChunksText = normalizeText(
        recentChunks
          .slice(0, -1)
          .map((c) => c.text)
          .join(" ")
      );

      const matchedRecurrent = latestSignificant.filter((kw) =>
        previousChunksText.includes(kw)
      );

      // Critério seletivo: ao menos 2 termos significativos recorrentes entre trechos distintos
      if (matchedRecurrent.length >= 2) {
        return {
          shouldEvaluateLlm: true,
          priorityType: "RECORRENCIA",
          urgency: "medium",
          reason: `Padrão ou tema recorrente identificado na sessão: ${matchedRecurrent.join(", ")}`,
          matchedKeywords: matchedRecurrent,
          candidateEvidence: {
            chunkId: latestChunk.id,
            quote: latestRawText.slice(0, 160),
          },
        };
      }
    }

    // 5. EXPLORAR: Oportunidade concreta de aprofundamento clínico (não qualquer conversa trivial)
    const hasExplorationMarker = CLINICAL_EXPLORATION_MARKERS.some((m) =>
      latestNormalized.includes(m)
    );

    // Se o texto não possui marcadores clínicos de afeto, conflito ou demanda: silêncio (não chamar LLM)
    if (!hasExplorationMarker) {
      return {
        shouldEvaluateLlm: false,
        reason: "Conversa em andamento sem ponto crítico de intervenção ou marcador clínico relevante.",
      };
    }

    // Oportunidade clínica relevante identificada
    return {
      shouldEvaluateLlm: true,
      priorityType: "EXPLORAR",
      urgency: "low",
      reason: "Oportunidade de aprofundamento clínico sobre o relato recente.",
      candidateEvidence: {
        chunkId: latestChunk.id,
        quote: latestRawText.slice(0, 160),
      },
    };
  }

  /**
   * Deduplica e prioriza eventos gerados para evitar repetições e ruído na interface.
   * - Garante prioridade: POTENTIAL_RISK > CONEXAO/RECORRENCIA > ACOMPANHAR > EXPLORAR > NOTA
   * - POTENTIAL_RISK nunca é descartado por deduplicação.
   * - Limita ao número máximo seguro de eventos por avaliação (ex: 2 a 3).
   */
  public deduplicateAndRankEvents(
    events: CopilotEvent[],
    maxEvents = 3
  ): CopilotEvent[] {
    if (!events || events.length === 0) return [];

    const uniqueMap = new Map<string, CopilotEvent>();

    for (const event of events) {
      // Chave semântica para evitar duplicações na mesma janela
      const semanticKey = `${event.type}:${normalizeText(event.title)}`;
      const quoteKey = event.evidence?.quote ? normalizeText(event.evidence.quote) : "";

      // 1. POTENTIAL_RISK sempre tem passe livre
      if (event.type === "POTENTIAL_RISK") {
        uniqueMap.set(`risk-${event.id}`, event);
        continue;
      }

      // 2. Verificar se já existe evento com o mesmo título ou mesma evidência exata
      let isDuplicate = false;
      for (const existing of uniqueMap.values()) {
        if (existing.type === "POTENTIAL_RISK") continue;

        const existingSemanticKey = `${existing.type}:${normalizeText(existing.title)}`;
        const existingQuoteKey = existing.evidence?.quote ? normalizeText(existing.evidence.quote) : "";

        if (
          existingSemanticKey === semanticKey ||
          (quoteKey && existingQuoteKey && quoteKey === existingQuoteKey && existing.type === event.type)
        ) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueMap.set(event.id, event);
      }
    }

    // Ordena de acordo com a hierarquia de prioridades
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
      const prioA = EVENT_TYPE_PRIORITY[a.type] ?? 0;
      const prioB = EVENT_TYPE_PRIORITY[b.type] ?? 0;
      return prioB - prioA;
    });

    return sorted.slice(0, maxEvents);
  }
}

export const eventEngine = new EventEngine();
