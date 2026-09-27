import type { RealtimeTranscriptChunk } from "../copilot/realtime/types";
import type { RawSTTInputPayload, STTSpeaker, STTTranscriptResult } from "./types";

/**
 * Normaliza os speakers para o padrão interno Cliniva ("paciente" | "terapeuta" | string).
 */
function normalizeSpeaker(speaker?: string | number): STTSpeaker | undefined {
  if (speaker === undefined || speaker === null) return undefined;
  const s = String(speaker).toLowerCase().trim();
  if (s === "paciente" || s === "patient" || s === "client" || s === "1" || s === "speaker_1") {
    return "paciente";
  }
  if (s === "terapeuta" || s === "therapist" || s === "doctor" || s === "0" || s === "speaker_0") {
    return "terapeuta";
  }
  return s;
}

/**
 * Normaliza timestamps e intervalos temporais em segundos com validação segura.
 */
function parseSeconds(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number" && !Number.isNaN(val) && val >= 0) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace("s", "").trim());
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

/**
 * Normalizador central de resultados STT:
 * Converte payloads heterogêneos de diferentes provedores para o contrato unificado STTTranscriptResult.
 */
export function normalizeSTTResult(raw: RawSTTInputPayload): STTTranscriptResult {
  if (!raw) {
    throw new Error("Payload STT inválido ou ausente.");
  }

  if (!raw.sessionId || !raw.therapistId) {
    throw new Error("Identificadores de segurança obrigatórios ausentes (sessionId, therapistId).");
  }

  // Extrai o texto da transcrição com fallback
  const rawText = raw.text ?? raw.transcript ?? "";
  const text = typeof rawText === "string" ? rawText.trim() : "";

  if (!text) {
    throw new Error("Resultado STT rejeitado: texto da transcrição está vazio ou inválido.");
  }

  // Determina final vs interim
  const isFinal = raw.isFinal ?? raw.is_final ?? true;
  const isInterim = !isFinal;

  // Confidence normalizada entre 0.0 e 1.0
  let confidence: number | undefined;
  const rawConf = raw.confidence ?? raw.confidenceScore;
  if (typeof rawConf === "number" && !Number.isNaN(rawConf)) {
    confidence = Math.min(Math.max(rawConf, 0), 1);
  }

  const tStartSeconds = parseSeconds(raw.tStartSeconds ?? raw.startTime);
  const tEndSeconds = parseSeconds(raw.tEndSeconds ?? raw.endTime);

  const id = raw.id && raw.id.trim().length > 0 ? raw.id.trim() : `stt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    sessionId: raw.sessionId,
    therapistId: raw.therapistId,
    patientId: raw.patientId,
    text,
    speaker: normalizeSpeaker(raw.speaker ?? raw.speakerTag),
    isFinal,
    isInterim,
    confidence,
    tStartSeconds,
    tEndSeconds,
    timestamp: raw.timestamp ?? Date.now(),
    sequenceNumber: raw.sequenceNumber,
    rawResponse: raw.raw ?? raw,
  };
}

/**
 * Converte diretamente um resultado de transcrição normalizado (STTTranscriptResult)
 * para o formato aceito pelo Copilot Realtime Engine (RealtimeTranscriptChunk).
 */
export function sttResultToRealtimeChunk(stt: STTTranscriptResult): RealtimeTranscriptChunk {
  if (!stt || !stt.id || !stt.text) {
    throw new Error("STTTranscriptResult inválido para conversão em RealtimeTranscriptChunk.");
  }

  return {
    id: stt.id,
    speaker: stt.speaker,
    text: stt.text,
    tStartSeconds: stt.tStartSeconds,
    tEndSeconds: stt.tEndSeconds,
    timestamp: stt.timestamp,
    sequenceNumber: stt.sequenceNumber,
  };
}
