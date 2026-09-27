import { z } from "zod";

/**
 * Estados da conexão da camada de transporte de áudio.
 */
export type AudioTransportState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "paused"
  | "error";

/**
 * Limite máximo seguro por chunk de áudio serializado (1 MB = 1_048_576 bytes em base64).
 */
export const MAX_AUDIO_CHUNK_BYTES = 1024 * 1024;

// ==========================================
// SCHEMAS CLIENT → SERVER
// ==========================================

export const SessionStartMessageSchema = z.object({
  type: z.literal("session_start"),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  therapistId: z.string().min(1, "therapistId é obrigatório"),
  patientId: z.string().optional(),
  mimeType: z.string().min(1, "mimeType é obrigatório"),
  sampleRate: z.number().int().positive().optional(),
  channelCount: z.number().int().positive().optional(),
  timestamp: z.number().positive().optional(),
});

export const AudioChunkMessageSchema = z.object({
  type: z.literal("audio_chunk"),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  therapistId: z.string().min(1, "therapistId é obrigatório"),
  patientId: z.string().optional(),
  sequenceNumber: z.number().int().nonnegative("sequenceNumber deve ser não-negativo"),
  dataBase64: z
    .string()
    .min(1, "dataBase64 não pode estar vazio")
    .max(
      Math.ceil((MAX_AUDIO_CHUNK_BYTES * 4) / 3) + 100,
      "Payload excede o limite máximo permitido de 1MB por chunk"
    ),
  mimeType: z.string().min(1, "mimeType é obrigatório"),
  timestamp: z.number().positive(),
  durationEstimatedSeconds: z.number().positive().optional(),
});

export const SessionPauseMessageSchema = z.object({
  type: z.literal("session_pause"),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  therapistId: z.string().min(1, "therapistId é obrigatório"),
  timestamp: z.number().positive().optional(),
});

export const SessionResumeMessageSchema = z.object({
  type: z.literal("session_resume"),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  therapistId: z.string().min(1, "therapistId é obrigatório"),
  timestamp: z.number().positive().optional(),
});

export const SessionStopMessageSchema = z.object({
  type: z.literal("session_stop"),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  therapistId: z.string().min(1, "therapistId é obrigatório"),
  timestamp: z.number().positive().optional(),
});

export const ClientAudioTransportMessageSchema = z.discriminatedUnion("type", [
  SessionStartMessageSchema,
  AudioChunkMessageSchema,
  SessionPauseMessageSchema,
  SessionResumeMessageSchema,
  SessionStopMessageSchema,
]);

// ==========================================
// SCHEMAS SERVER → CLIENT
// ==========================================

export const SessionAckMessageSchema = z.object({
  type: z.literal("session_ack"),
  sessionId: z.string(),
  therapistId: z.string(),
  status: z.enum(["started", "paused", "resumed", "stopped", "received_chunk"]),
  sequenceNumberAcked: z.number().int().optional(),
  timestamp: z.number().positive(),
});

export const TranscriptInterimMessageSchema = z.object({
  type: z.literal("transcript_interim"),
  sessionId: z.string(),
  therapistId: z.string(),
  text: z.string(),
  speaker: z.string().optional(),
  sequenceNumber: z.number().int().optional(),
  timestamp: z.number().positive(),
});

export const TranscriptFinalMessageSchema = z.object({
  type: z.literal("transcript_final"),
  sessionId: z.string(),
  therapistId: z.string(),
  chunkId: z.string(),
  text: z.string(),
  speaker: z.string().optional(),
  tStartSeconds: z.number().optional(),
  tEndSeconds: z.number().optional(),
  confidence: z.number().optional(),
  sequenceNumber: z.number().int().optional(),
  timestamp: z.number().positive(),
});

export const TransportErrorMessageSchema = z.object({
  type: z.literal("transport_error"),
  sessionId: z.string().optional(),
  therapistId: z.string().optional(),
  code: z.string(),
  message: z.string(),
  timestamp: z.number().positive(),
});

export const ServerAudioTransportMessageSchema = z.discriminatedUnion("type", [
  SessionAckMessageSchema,
  TranscriptInterimMessageSchema,
  TranscriptFinalMessageSchema,
  TransportErrorMessageSchema,
]);

export const AudioTransportMessageSchema = z.union([
  ClientAudioTransportMessageSchema,
  ServerAudioTransportMessageSchema,
]);

// ==========================================
// TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type ClientAudioTransportMessage = z.infer<typeof ClientAudioTransportMessageSchema>;
export type ServerAudioTransportMessage = z.infer<typeof ServerAudioTransportMessageSchema>;
export type AudioTransportMessage = z.infer<typeof AudioTransportMessageSchema>;

export type SessionStartMessage = z.infer<typeof SessionStartMessageSchema>;
export type AudioChunkMessage = z.infer<typeof AudioChunkMessageSchema>;
export type SessionPauseMessage = z.infer<typeof SessionPauseMessageSchema>;
export type SessionResumeMessage = z.infer<typeof SessionResumeMessageSchema>;
export type SessionStopMessage = z.infer<typeof SessionStopMessageSchema>;
export type SessionAckMessage = z.infer<typeof SessionAckMessageSchema>;
export type TranscriptInterimMessage = z.infer<typeof TranscriptInterimMessageSchema>;
export type TranscriptFinalMessage = z.infer<typeof TranscriptFinalMessageSchema>;
export type TransportErrorMessage = z.infer<typeof TransportErrorMessageSchema>;

/**
 * Configuração de inicialização do AudioTransport.
 */
export interface AudioTransportConfig {
  sessionId: string;
  therapistId: string;
  patientId?: string;
  endpointUrl?: string;
  maxQueueSize?: number; // Backpressure limit (default: 50)
  heartbeatIntervalMs?: number;
}

/**
 * Eventos recebidos pelo AudioTransport.
 */
export interface AudioTransportEvents {
  onMessage?: (message: ServerAudioTransportMessage) => void;
  onStateChange?: (state: AudioTransportState) => void;
  onError?: (error: Error) => void;
  onBackpressure?: (queueLength: number) => void;
}

/**
 * Contrato de Transporte de Áudio.
 */
export interface IAudioTransport {
  readonly state: AudioTransportState;
  readonly sessionId: string;
  readonly therapistId: string;
  connect(): Promise<void>;
  send(message: ClientAudioTransportMessage): void;
  disconnect(): void;
}
