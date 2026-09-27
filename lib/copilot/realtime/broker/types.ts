import { z } from "zod";
import { CopilotEventTypeEnum } from "../../types";

/**
 * Schema Zod completo para o CopilotEvent reutilizado na camada SSE.
 */
export const SSECopilotEventPayloadSchema = z.object({
  id: z.string().min(1),
  type: CopilotEventTypeEnum,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  urgency: z.enum(["low", "medium", "high"]),
  rationale: z.string().trim().optional(),
  suggestedAction: z.string().trim().optional(),
  evidence: z
    .object({
      chunkId: z.string().optional(),
      sessionId: z.string().optional(),
      quote: z.string(),
    })
    .optional(),
  createdAt: z.string(),
});

// ==========================================
// SCHEMAS INDIVIDUAIS DE EVENTOS SSE
// ==========================================

export const ConnectionReadyEventSchema = z.object({
  type: z.literal("connection_ready"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  timestamp: z.number().positive(),
  message: z.string().optional(),
});

export const TranscriptInterimEventSchema = z.object({
  type: z.literal("transcript_interim"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  text: z.string(),
  speaker: z.string().optional(),
  sequenceNumber: z.number().int().optional(),
  timestamp: z.number().positive(),
});

export const TranscriptFinalEventSchema = z.object({
  type: z.literal("transcript_final"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  chunkId: z.string().min(1),
  text: z.string(),
  speaker: z.string().optional(),
  tStartSeconds: z.number().optional(),
  tEndSeconds: z.number().optional(),
  confidence: z.number().optional(),
  sequenceNumber: z.number().int().optional(),
  timestamp: z.number().positive(),
});

export const CopilotEventSSESchema = z.object({
  type: z.literal("copilot_event"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  event: SSECopilotEventPayloadSchema,
  timestamp: z.number().positive(),
});

export const PipelineErrorEventSchema = z.object({
  type: z.literal("pipeline_error"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  error: z.string(),
  errorCode: z.string().optional(),
  timestamp: z.number().positive(),
});

export const SessionStatusEventSchema = z.object({
  type: z.literal("session_status"),
  sessionId: z.string().min(1),
  therapistId: z.string().min(1),
  status: z.enum(["active", "paused", "resumed", "ended"]),
  timestamp: z.number().positive(),
});

export const HeartbeatEventSchema = z.object({
  type: z.literal("heartbeat"),
  timestamp: z.number().positive(),
});

/**
 * Discriminated Union com todos os tipos de eventos trafegados via SSE.
 */
export const SSEEventSchema = z.discriminatedUnion("type", [
  ConnectionReadyEventSchema,
  TranscriptInterimEventSchema,
  TranscriptFinalEventSchema,
  CopilotEventSSESchema,
  PipelineErrorEventSchema,
  SessionStatusEventSchema,
  HeartbeatEventSchema,
]);

export type SSEEvent = z.infer<typeof SSEEventSchema>;
export type ConnectionReadyEvent = z.infer<typeof ConnectionReadyEventSchema>;
export type TranscriptInterimEvent = z.infer<typeof TranscriptInterimEventSchema>;
export type TranscriptFinalEvent = z.infer<typeof TranscriptFinalEventSchema>;
export type CopilotEventSSE = z.infer<typeof CopilotEventSSESchema>;
export type PipelineErrorEvent = z.infer<typeof PipelineErrorEventSchema>;
export type SessionStatusEvent = z.infer<typeof SessionStatusEventSchema>;
export type HeartbeatEvent = z.infer<typeof HeartbeatEventSchema>;

/**
 * Listener de eventos para uma sessão específica.
 */
export type SSEEventListener = (event: SSEEvent) => void;
