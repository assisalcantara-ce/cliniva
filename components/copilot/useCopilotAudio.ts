"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture } from "@/lib/audio/audioCapture";
import { WebSocketAudioTransport } from "@/lib/audio/transport/websocketTransport";
import { audioChunkToBase64 } from "@/lib/audio/mimeHelper";
import type { AudioChunk } from "@/lib/audio/types";
import type { AudioTransportState, ServerAudioTransportMessage } from "@/lib/audio/transport/types";
import type { CopilotEvent } from "@/lib/copilot/types";

export type CopilotAudioOverallState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "transcribing"
  | "paused"
  | "reconnecting"
  | "error"
  | "ended";

export interface UseCopilotAudioProps {
  sessionId: string;
  therapistId?: string;
  patientId?: string;
  enabled?: boolean;
  endpointUrl?: string;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string, chunkId: string) => void;
  onCopilotEvent?: (event: CopilotEvent) => void;
  onError?: (error: Error) => void;
}

export interface UseCopilotAudioResult {
  state: CopilotAudioOverallState;
  error: string | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Hook orquestrador de áudio real do Copilot:
 * Browser Microphone → AudioCapture → WebSocketAudioTransport → Gateway.
 */
export function useCopilotAudio({
  sessionId,
  therapistId,
  patientId,
  enabled = false,
  endpointUrl,
  onInterimTranscript,
  onFinalTranscript,
  onCopilotEvent,
  onError,
}: UseCopilotAudioProps): UseCopilotAudioResult {
  const [state, setState] = useState<CopilotAudioOverallState>("idle");
  const [error, setError] = useState<string | null>(null);

  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const transportRef = useRef<WebSocketAudioTransport | null>(null);
  const isStartedRef = useRef<boolean>(false);
  const sequenceCounterRef = useRef<number>(0);

  const handleStop = useCallback(() => {
    isStartedRef.current = false;

    if (audioCaptureRef.current) {
      try {
        audioCaptureRef.current.destroy();
      } catch {
        // ignore
      }
      audioCaptureRef.current = null;
    }

    if (transportRef.current) {
      try {
        if (
          therapistId &&
          (transportRef.current.state === "connected" ||
          transportRef.current.state === "paused")
        ) {
          transportRef.current.send({
            type: "session_stop",
            sessionId,
            therapistId,
            timestamp: Date.now(),
          });
        }
        transportRef.current.disconnect();
      } catch {
        // ignore
      }
      transportRef.current = null;
    }

    setState("ended");
  }, [sessionId, therapistId]);

  const handlePause = useCallback(() => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.pause();
    }
    if (transportRef.current && therapistId) {
      try {
        transportRef.current.send({
          type: "session_pause",
          sessionId,
          therapistId,
          timestamp: Date.now(),
        });
      } catch {
        // ignore
      }
    }
    setState("paused");
  }, [sessionId, therapistId]);

  const handleResume = useCallback(() => {
    if (transportRef.current && therapistId) {
      try {
        transportRef.current.send({
          type: "session_resume",
          sessionId,
          therapistId,
          timestamp: Date.now(),
        });
      } catch {
        // ignore
      }
    }
    if (audioCaptureRef.current) {
      audioCaptureRef.current.resume();
    }
    setState("listening");
  }, [sessionId, therapistId]);

  const handleStart = useCallback(async () => {
    if (isStartedRef.current) return;
    setError(null);

    if (!therapistId) {
      setError("Identidade do terapeuta não confirmada.");
      setState("error");
      return;
    }

    setState("connecting");

    const effectiveTherapistId = therapistId;
    sequenceCounterRef.current = 0;
    const t0 = Date.now();

    // 1. Instanciar e Conectar WebSocketAudioTransport
    const transport = new WebSocketAudioTransport(
      {
        sessionId,
        therapistId: effectiveTherapistId,
        patientId,
        endpointUrl,
        autoReconnect: false,
      },
      {
        onStateChange: (transportState: AudioTransportState) => {
          if (transportState === "error") {
            setState("error");
          } else if (transportState === "connecting") {
            setState("reconnecting");
          } else if (transportState === "paused") {
            setState("paused");
          } else if (transportState === "connected" && isStartedRef.current) {
            setState("listening");
          }
        },
        onError: (err: Error) => {
          setError(err.message);
          onError?.(err);
        },
        onMessage: (msg: ServerAudioTransportMessage) => {
          if (msg.type === "transport_error") {
            setError(msg.message);
          } else if (msg.type === "transcript_interim") {
            onInterimTranscript?.(msg.text);
          } else if (msg.type === "transcript_final") {
            onFinalTranscript?.(msg.text, msg.chunkId);
          } else if (msg.type === "copilot_event") {
            onCopilotEvent?.(msg.event as CopilotEvent);
          }
        },
      }
    );

    transportRef.current = transport;

    try {
      await transport.connect();
      console.log(`[CopilotAudio] ws_connect_ms: ${Date.now() - t0}`);

      // 2. Enviar session_start
      transport.send({
        type: "session_start",
        sessionId,
        therapistId: effectiveTherapistId,
        patientId,
        mimeType: "audio/webm;codecs=opus",
        sampleRate: 16000,
        channelCount: 1,
        timestamp: Date.now(),
      });

      // 3. Inicializar AudioCapture
      const capture = new AudioCapture(
        {
          timeSliceMs: 2000,
          sampleRate: 16000,
          channelCount: 1,
        },
        {
          onChunk: async (chunk: AudioChunk) => {
            if (!isStartedRef.current || !transportRef.current) return;
            try {
              const base64Data = await audioChunkToBase64(chunk.blob);
              sequenceCounterRef.current += 1;

              if (sequenceCounterRef.current === 1) {
                console.log(`[CopilotAudio] first_chunk_sent_ms: ${Date.now() - t0}`);
              }

              transportRef.current.send({
                type: "audio_chunk",
                sessionId,
                therapistId: effectiveTherapistId,
                patientId,
                sequenceNumber: sequenceCounterRef.current,
                dataBase64: base64Data,
                mimeType: chunk.mimeType || capture.mimeType || "audio/webm",
                timestamp: chunk.timestamp,
                durationEstimatedSeconds: chunk.durationEstimatedSeconds,
              });
            } catch {
              // Silencioso por chunk para não quebrar gravação
            }
          },
          onError: (err: Error) => {
            setError(err.message);
            setState("error");
            onError?.(err);
          },
        }
      );

      audioCaptureRef.current = capture;

      // 4. Solicitar microfone e iniciar gravação
      const t1 = Date.now();
      await capture.start();
      console.log(`[CopilotAudio] mic_permission_ms: ${Date.now() - t1}`);

      isStartedRef.current = true;
      setState("listening");
    } catch (err: unknown) {
      const structuredErr =
        err instanceof Error ? err : new Error(String(err));
      setError(structuredErr.message);
      setState("error");
      onError?.(structuredErr);
      handleStop();
    }
  }, [sessionId, therapistId, patientId, endpointUrl, onError, handleStop, onInterimTranscript, onFinalTranscript, onCopilotEvent]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (enabled) {
      timer = setTimeout(() => {
        void handleStart();
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (isStartedRef.current) {
        handleStop();
      }
    };
  }, [enabled, handleStart, handleStop]);

  return {
    state,
    error,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    stop: handleStop,
  };
}
