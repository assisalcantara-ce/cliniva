import type {
  CopilotContext,
  CopilotEvent,
  CopilotTranscriptSnippet,
  CopilotPatientProfile,
} from "./types";
import { eventEngine } from "./eventEngine";

export interface SimulationStepResult {
  stepIndex: number;
  chunk: CopilotTranscriptSnippet;
  contextSnapshot: {
    totalChunksSoFar: number;
    recentChunksCount: number;
  };
  evaluation: {
    shouldEvaluateLlm: boolean;
    priorityType?: string;
    reason?: string;
  };
  eventsGenerated: CopilotEvent[];
}

export interface SimulationSummary {
  sessionId: string;
  therapistId: string;
  patientName?: string;
  totalChunksProcessed: number;
  totalEventsEmitted: number;
  steps: SimulationStepResult[];
  timelineEvents: CopilotEvent[];
}

export interface SessionSimulationOptions {
  sessionId: string;
  therapistId: string;
  /** Janela deslizante de trechos recentes */
  windowSize?: number;
  /** Perfil opcional pré-carregado do paciente */
  patientProfile?: CopilotPatientProfile;
  /** Lista ordenada de transcript_chunks a simular */
  chunks: CopilotTranscriptSnippet[];
  /** Função de inferência customizada ou simulador (opcional para testes isolados) */
  customEngineRunner?: (context: CopilotContext) => Promise<CopilotEvent[]>;
}

/**
 * Simulador sequencial do Copilot 2.0 (SessionCopilotSimulator).
 * Processa transcript_chunks em ordem cronológica estrita,
 * atualizando o contexto incrementalmente e avaliando os eventos emitidos.
 */
export class SessionCopilotSimulator {
  /**
   * Executa a simulação completa da sessão a partir dos chunks fornecidos em memória.
   */
  public async simulateSession(options: SessionSimulationOptions): Promise<SimulationSummary> {
    const {
      sessionId,
      therapistId,
      windowSize = 4,
      patientProfile,
      chunks,
      customEngineRunner,
    } = options;

    const steps: SimulationStepResult[] = [];
    const timelineEvents: CopilotEvent[] = [];
    const accumulatedChunks: CopilotTranscriptSnippet[] = [];

    // Processa cada trecho em sequência temporal
    for (let i = 0; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      accumulatedChunks.push(currentChunk);

      const recentWindow = accumulatedChunks.slice(-windowSize);

      const context: CopilotContext = {
        sessionId,
        therapistId,
        patient: patientProfile,
        recentChunks: recentWindow,
        totalChunksCount: accumulatedChunks.length,
      };

      // 1. Avaliação heurística do EventEngine
      const evaluation = eventEngine.evaluateContext(context);

      // 2. Execução do CopilotEngine (ou customEngineRunner para testes isolados)
      let eventsGenerated: CopilotEvent[] = [];
      if (evaluation.shouldEvaluateLlm) {
        if (customEngineRunner) {
          eventsGenerated = await customEngineRunner(context);
        } else {
          const { generateCopilotEvents } = await import("./copilotEngine");
          eventsGenerated = await generateCopilotEvents(context);
        }
      }

      // 3. Deduplicação contra a timeline recente de eventos já emitidos
      const filteredEvents: CopilotEvent[] = [];
      for (const ev of eventsGenerated) {
        // Verifica se evento idêntico em tipo e citação já foi emitido no passo imediatamente anterior
        const isDuplicateRecent = timelineEvents.some(
          (prevEv) =>
            prevEv.type === ev.type &&
            prevEv.evidence?.quote &&
            ev.evidence?.quote &&
            prevEv.evidence.quote.toLowerCase() === ev.evidence.quote.toLowerCase() &&
            ev.type !== "POTENTIAL_RISK"
        );

        if (!isDuplicateRecent) {
          filteredEvents.push(ev);
          timelineEvents.push(ev);
        }
      }

      steps.push({
        stepIndex: i + 1,
        chunk: currentChunk,
        contextSnapshot: {
          totalChunksSoFar: accumulatedChunks.length,
          recentChunksCount: recentWindow.length,
        },
        evaluation: {
          shouldEvaluateLlm: evaluation.shouldEvaluateLlm,
          priorityType: evaluation.priorityType,
          reason: evaluation.reason,
        },
        eventsGenerated: filteredEvents,
      });
    }

    return {
      sessionId,
      therapistId,
      patientName: patientProfile?.name,
      totalChunksProcessed: chunks.length,
      totalEventsEmitted: timelineEvents.length,
      steps,
      timelineEvents,
    };
  }

  /**
   * Executa a simulação carregando a sessão e transcript_chunks reais do banco.
   */
  public async simulateRealSessionFromDb(params: {
    sessionId: string;
    therapistId: string;
    windowSize?: number;
  }): Promise<SimulationSummary> {
    const { sessionId, therapistId, windowSize = 4 } = params;

    const { buildCopilotContext } = await import("./contextEngine");
    // Carrega o contexto e chunks completos do banco
    const baseContext = await buildCopilotContext({
      sessionId,
      therapistId,
      windowSize: 9999, // busca todos os chunks
    });

    return this.simulateSession({
      sessionId,
      therapistId,
      windowSize,
      patientProfile: baseContext.patient,
      chunks: baseContext.recentChunks, // todos os chunks em ordem
    });
  }
}

export const sessionCopilotSimulator = new SessionCopilotSimulator();
