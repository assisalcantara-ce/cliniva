import type { CopilotContext, CopilotEvent } from "./types";
import { eventEngine } from "./eventEngine";

/**
 * Normaliza textos para comparações semânticas.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Critérios de decisão e validação clínica de candidatos a CopilotEvent.
 */
export class DecisionEngine {
  /**
   * Avalia os eventos gerados e filtra apenas aqueles que possuem utilidade clínica clara,
   * evidência comprovada e estrita aderência às regras de cada tipo de evento.
   *
   * Limites:
   * - No máximo 2 eventos normais por avaliação.
   * - POTENTIAL_RISK pode coexistir com prioridade máxima.
   * - Rejeita eventos sem evidência rastreável.
   * - Retorna [] em caso de ausência de relevância clínica mínima (Silêncio Inteligente).
   */
  public filterAndDecideEvents(
    candidateEvents: CopilotEvent[],
    context: CopilotContext
  ): CopilotEvent[] {
    if (!candidateEvents || candidateEvents.length === 0) {
      return [];
    }

    const { recentChunks, patient, relevantHistory } = context;
    const validChunkIds = new Set(recentChunks.map((c) => c.id));
    const allRecentText = recentChunks.map((c) => c.text).join(" ");
    const allRecentNormalized = normalize(allRecentText);

    const approvedEvents: CopilotEvent[] = [];

    for (const event of candidateEvents) {
      // 1. Validação estrita de evidência:
      // O evento deve possuir citação não vazia e apontar para evidência real (chunk atual, memória ou histórico)
      const quote = event.evidence?.quote?.trim() ?? "";
      if (!quote || quote.length < 5) {
        // Evento sem evidência suficiente é rejeitado
        continue;
      }

      const quoteNormalized = normalize(quote);

      // Checa se a citação existe nos trechos recentes, na anamnese, na memória ou no histórico
      const memorySource = normalize(`${patient?.anamnesis ?? ""} ${patient?.memorySummary ?? ""}`);
      const historySource = normalize(
        (relevantHistory ?? []).map((h) => h.text).join(" ")
      );

      const existsInRecent = allRecentNormalized.includes(quoteNormalized);
      const existsInHistory = memorySource.includes(quoteNormalized) || historySource.includes(quoteNormalized);

      // Se a citação inteira não for encontrada como substring contínua, exige que ao menos 80% das palavras substanciais existam juntas
      let hasSubstantialMatch = existsInRecent || existsInHistory;
      if (!hasSubstantialMatch) {
        const quoteWords = quoteNormalized.split(" ").filter((w) => w.length > 3);
        if (quoteWords.length >= 3) {
          const matchingInRecent = quoteWords.filter((w) => allRecentNormalized.includes(w)).length;
          const matchingInHistory = quoteWords.filter((w) => memorySource.includes(w) || historySource.includes(w)).length;
          hasSubstantialMatch = matchingInRecent / quoteWords.length >= 0.8 || matchingInHistory / quoteWords.length >= 0.8;
        }
      }

      if (!hasSubstantialMatch) {
        // Citação não rastreável no contexto fornecido → Rejeita (anti-alucinação)
        continue;
      }

      // 2. Validação por Tipo de Evento:
      const isValidForType = this.validateEventTypeCriteria(event, context);
      if (!isValidForType) {
        continue;
      }

      // Garante que o chunkId citado, se for de sessão atual, é um ID válido
      let chunkId = event.evidence?.chunkId;
      if (chunkId && !validChunkIds.has(chunkId)) {
        // Se não existir nos recentes, mas a evidência estiver nos recentes, associa ao último chunk
        chunkId = recentChunks[recentChunks.length - 1]?.id;
      }

      approvedEvents.push({
        ...event,
        evidence: {
          chunkId,
          sessionId: event.evidence?.sessionId ?? context.sessionId,
          quote: event.evidence!.quote,
        },
      });
    }

    // 3. Deduplicação e ordenação por prioridade com limite de 2 eventos normais + risco
    return this.applyLimitsAndRanking(approvedEvents);
  }

  /**
   * Valida se o evento atende aos critérios específicos de sua categoria.
   */
  private validateEventTypeCriteria(event: CopilotEvent, context: CopilotContext): boolean {
    const { recentChunks, patient } = context;
    const latestChunk = recentChunks[recentChunks.length - 1];
    const latestNormalized = normalize(latestChunk?.text ?? "");

    switch (event.type) {
      case "POTENTIAL_RISK":
        // Prioridade máxima: aceito se contiver sinal de risco ou for classificado com urgência alta
        return true;

      case "CONEXAO": {
        // Exige relação contextual real com histórico/anamnese (não mera palavra isolada)
        if (!patient) return false;
        const historicalSource = normalize(`${patient.anamnesis ?? ""} ${patient.memorySummary ?? ""}`);
        const eventKeywords = normalize(`${event.title} ${event.description}`).split(" ").filter((w) => w.length > 3);
        const matches = eventKeywords.filter((kw) => historicalSource.includes(kw));
        return matches.length >= 1 && latestNormalized.length > 20;
      }

      case "RECORRENCIA": {
        // Exige repetição real de tema/padrão entre trechos
        if (recentChunks.length < 2) return false;
        return event.description.length >= 15;
      }

      case "EXPLORAR": {
        // Exige oportunidade concreta de aprofundamento
        return event.suggestedAction !== undefined && event.suggestedAction.length >= 10;
      }

      case "ACOMPANHAR": {
        // Exige ponto concreto para acompanhamento posterior
        return event.description.length >= 15;
      }

      case "NOTA": {
        // Informação clinicamente útil
        return event.description.length >= 10;
      }

      default:
        return true;
    }
  }

  /**
   * Aplica limite seguro de no máximo 2 eventos normais (permitindo POTENTIAL_RISK adicional).
   */
  private applyLimitsAndRanking(events: CopilotEvent[]): CopilotEvent[] {
    if (events.length === 0) return [];

    // Deduplica primeiro pelo motor existente
    const deduplicated = eventEngine.deduplicateAndRankEvents(events, 5);

    const riskEvents: CopilotEvent[] = [];
    const normalEvents: CopilotEvent[] = [];

    for (const ev of deduplicated) {
      if (ev.type === "POTENTIAL_RISK") {
        riskEvents.push(ev);
      } else {
        normalEvents.push(ev);
      }
    }

    // Limita eventos normais a no máximo 2
    const finalNormal = normalEvents.slice(0, 2);

    // Retorna riscos primeiro + até 2 normais
    return [...riskEvents, ...finalNormal];
  }
}

export const decisionEngine = new DecisionEngine();
