import type {
  CopilotContext,
  CopilotEvent,
  CopilotPatientProfile,
  CopilotTranscriptSnippet,
} from "../types";
import { eventEngine } from "../eventEngine";
import { decisionEngine } from "../decisionEngine";
import type {
  RealtimeCopilotInput,
  RealtimeCopilotResult,
  RealtimeSessionInitOptions,
  RealtimeTranscriptChunk,
} from "./types";

/**
 * Processador incremental de sessão em tempo real (RealtimeCopilotProcessor).
 * 
 * Responsabilidades:
 * 1. Mantém estado volátil durante a execução da sessão em memória (sem persistência no banco).
 * 2. Valida consistência de isolamento por `sessionId`, `therapistId` e `patientId`.
 * 3. Trata e rejeita chunks fora de ordem temporal.
 * 4. Orquestra o pipeline unificado:
 *    Chunk → Context Window → EventEngine → CopilotEngine → DecisionEngine → NewEvents.
 * 5. Garante deduplicação e controle de histórico de eventos emitidos na sessão.
 */
export class RealtimeCopilotProcessor {
  private readonly sessionId: string;
  private readonly therapistId: string;
  private readonly patientId?: string;
  private readonly windowSize: number;
  private patientProfile?: CopilotPatientProfile;

  // Estado em memória da sessão ativa
  private accumulatedChunks: CopilotTranscriptSnippet[] = [];
  private emittedEventsHistory: CopilotEvent[] = [];
  private lastChunkTimestamp: number = 0;
  private lastSequenceNumber: number = 0;

  // Runner de inferência customizado (opcional para testes desacoplados)
  private customEngineRunner?: (context: CopilotContext) => Promise<CopilotEvent[]>;

  constructor(options: RealtimeSessionInitOptions) {
    if (!options.sessionId || !options.therapistId) {
      throw new Error("RealtimeCopilotProcessor requer sessionId e therapistId válidos.");
    }

    this.sessionId = options.sessionId;
    this.therapistId = options.therapistId;
    this.patientId = options.patientId ?? options.patientProfile?.id;
    this.patientProfile = options.patientProfile;
    this.windowSize = options.windowSize ?? 4;
    this.customEngineRunner = options.customEngineRunner;
  }

  /**
   * Atualiza ou injeta o perfil do paciente em tempo de execução.
   */
  public setPatientProfile(profile: CopilotPatientProfile): void {
    if (this.patientId && profile.id !== this.patientId) {
      throw new Error("Inconsistência de segurança: patientId não confere com a sessão ativa.");
    }
    this.patientProfile = profile;
  }

  /**
   * Processa incrementalmente um novo transcript chunk na sessão.
   */
  public async processChunk(input: RealtimeCopilotInput): Promise<RealtimeCopilotResult> {
    const { sessionId, therapistId, patientId, chunk } = input;

    // 1. Validação de Isolamento e Integridade da Sessão
    if (sessionId !== this.sessionId || therapistId !== this.therapistId) {
      throw new Error(
        `Inconsistência de isolamento na sessão. Esperado: [session: ${this.sessionId}, therapist: ${this.therapistId}], Recebido: [session: ${sessionId}, therapist: ${therapistId}].`
      );
    }

    if (this.patientId && patientId && patientId !== this.patientId) {
      throw new Error(
        `Inconsistência de paciente: [sessão: ${this.patientId}, chunk: ${patientId}].`
      );
    }

    // 2. Validação e Tratamento de Ordem Temporal
    if (!chunk.id || !chunk.text) {
      throw new Error("Chunk inválido: id e text são obrigatórios.");
    }

    if (chunk.sequenceNumber !== undefined && chunk.sequenceNumber < this.lastSequenceNumber) {
      throw new Error(
        `Chunk fora de ordem detectado (sequenceNumber: ${chunk.sequenceNumber} < anterior: ${this.lastSequenceNumber}).`
      );
    }

    if (chunk.timestamp !== undefined && chunk.timestamp < this.lastChunkTimestamp) {
      throw new Error(
        `Chunk fora de ordem temporal (timestamp: ${chunk.timestamp} < anterior: ${this.lastChunkTimestamp}).`
      );
    }

    if (chunk.sequenceNumber !== undefined) this.lastSequenceNumber = chunk.sequenceNumber;
    if (chunk.timestamp !== undefined) this.lastChunkTimestamp = chunk.timestamp;

    // 3. Acumula o chunk no histórico volátil
    const snippet: CopilotTranscriptSnippet = {
      id: chunk.id,
      speaker: chunk.speaker,
      text: chunk.text,
      tStartSeconds: chunk.tStartSeconds,
      tEndSeconds: chunk.tEndSeconds,
    };
    this.accumulatedChunks.push(snippet);

    // 4. Monta a Janela Recente de Contexto
    const recentWindow = this.accumulatedChunks.slice(-this.windowSize);

    const context: CopilotContext = {
      sessionId: this.sessionId,
      therapistId: this.therapistId,
      patient: this.patientProfile,
      recentChunks: recentWindow,
      totalChunksCount: this.accumulatedChunks.length,
    };

    // 5. Avaliação Heurística de Relevância pelo EventEngine
    const evaluation = eventEngine.evaluateContext(context);
    if (!evaluation.shouldEvaluateLlm) {
      return {
        sessionId: this.sessionId,
        therapistId: this.therapistId,
        chunkId: chunk.id,
        newEvents: [],
        suppressedEventsCount: 0,
        processedChunksCount: this.accumulatedChunks.length,
        totalEventsEmittedCount: this.emittedEventsHistory.length,
        statusReason: evaluation.reason ?? "Silêncio ativo: trecho sem relevância clínica imediata.",
      };
    }

    // 6. Inferência de Candidatos pelo CopilotEngine (ou customEngineRunner)
    let candidateEvents: CopilotEvent[] = [];
    if (this.customEngineRunner) {
      candidateEvents = await this.customEngineRunner(context);
    } else {
      const { generateCopilotEvents } = await import("../copilotEngine");
      candidateEvents = await generateCopilotEvents(context);
    }

    // 7. Filtro Clínico e Validação pelo DecisionEngine
    const decidedEvents = decisionEngine.filterAndDecideEvents(candidateEvents, context);

    // 8. Deduplicação contra eventos já emitidos na sessão ativa
    const finalNewEvents: CopilotEvent[] = [];
    let suppressedCount = 0;

    for (const event of decidedEvents) {
      // POTENTIAL_RISK sempre emitido
      if (event.type === "POTENTIAL_RISK") {
        finalNewEvents.push(event);
        this.emittedEventsHistory.push(event);
        continue;
      }

      // Verifica se evento equivalente já foi emitido anteriormente na sessão
      const currentQuoteNorm = event.evidence?.quote
        ? event.evidence.quote.toLowerCase().trim()
        : "";
      const currentTitleNorm = event.title.toLowerCase().trim();

      const isDuplicate = this.emittedEventsHistory.some((prev) => {
        const prevQuoteNorm = prev.evidence?.quote
          ? prev.evidence.quote.toLowerCase().trim()
          : "";
        const prevTitleNorm = prev.title.toLowerCase().trim();

        const exactQuoteMatch =
          Boolean(currentQuoteNorm && prevQuoteNorm && currentQuoteNorm === prevQuoteNorm);

        const quoteContainmentMatch =
          prev.type === event.type &&
          Boolean(currentQuoteNorm &&
            prevQuoteNorm &&
            (currentQuoteNorm.includes(prevQuoteNorm) ||
              prevQuoteNorm.includes(currentQuoteNorm)));

        const titleMatch =
          prev.type === event.type &&
          Boolean(currentTitleNorm && prevTitleNorm && currentTitleNorm === prevTitleNorm);

        return exactQuoteMatch || quoteContainmentMatch || titleMatch;
      });

      if (isDuplicate) {
        suppressedCount++;
      } else {
        finalNewEvents.push(event);
        this.emittedEventsHistory.push(event);
      }
    }

    return {
      sessionId: this.sessionId,
      therapistId: this.therapistId,
      chunkId: chunk.id,
      newEvents: finalNewEvents,
      suppressedEventsCount: suppressedCount + (candidateEvents.length - decidedEvents.length),
      processedChunksCount: this.accumulatedChunks.length,
      totalEventsEmittedCount: this.emittedEventsHistory.length,
      statusReason: finalNewEvents.length > 0 ? "Eventos clínicos gerados com sucesso." : "Silêncio inteligente / suprimido.",
    };
  }

  /**
   * Retorna o total de chunks processados até o momento.
   */
  public getProcessedChunksCount(): number {
    return this.accumulatedChunks.length;
  }

  /**
   * Retorna a lista completa de eventos emitidos nesta sessão.
   */
  public getEmittedEvents(): CopilotEvent[] {
    return [...this.emittedEventsHistory];
  }
}
