import type {
  CopilotContext,
  CopilotEvent,
  CopilotPatientProfile,
  CopilotTranscriptSnippet,
} from "../types";

/**
 * Trecho de transcrição recebido incrementalmente no fluxo em tempo real.
 */
export interface RealtimeTranscriptChunk {
  id: string;
  speaker?: string | null;
  text: string;
  tStartSeconds?: number | null;
  tEndSeconds?: number | null;
  /** Timestamp de recepção do chunk para ordenação/conferência */
  timestamp?: number;
  /** Número de sequência incremental (opcional para checagem de ordem) */
  sequenceNumber?: number;
}

/**
 * Parâmetros de entrada para o processamento incremental de um chunk no Copilot.
 */
export interface RealtimeCopilotInput {
  sessionId: string;
  therapistId: string;
  patientId?: string;
  chunk: RealtimeTranscriptChunk;
}

/**
 * Resultado da avaliação incremental de um chunk pelo RealtimeCopilotProcessor.
 */
export interface RealtimeCopilotResult {
  sessionId: string;
  therapistId: string;
  chunkId: string;
  /** Novos eventos clínicos aprovados pelo DecisionEngine */
  newEvents: CopilotEvent[];
  /** Eventos suprimidos por deduplicação, filtro de ruído ou falta de evidência */
  suppressedEventsCount: number;
  /** Total acumulado de chunks processados nesta sessão */
  processedChunksCount: number;
  /** Total de eventos emitidos nesta sessão até o momento */
  totalEventsEmittedCount: number;
  /** Motivo em caso de silêncio ou supressão (útil para auditoria e testes) */
  statusReason?: string;
}

/**
 * Opções de inicialização da sessão de processamento em tempo real.
 */
export interface RealtimeSessionInitOptions {
  sessionId: string;
  therapistId: string;
  patientId?: string;
  patientProfile?: CopilotPatientProfile;
  /** Janela deslizante de trechos recentes mantida em memória (default: 4) */
  windowSize?: number;
  /** Runner customizado de inferência para testes determinísticos ou mocks */
  customEngineRunner?: (context: CopilotContext) => Promise<CopilotEvent[]>;
}
