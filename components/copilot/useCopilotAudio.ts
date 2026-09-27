"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture } from "@/lib/audio/audioCapture";
import { WebSocketAudioTransport } from "@/lib/audio/transport/websocketTransport";
import { audioChunkToBase64 } from "@/lib/audio/mimeHelper";
import type { AudioChunk } from "@/lib/audio/types";
import type { AudioTransportState, ServerAudioTransportMessage } from "@/lib/audio/transport/types";

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
          transportRef.current.state === "connected" ||
          transportRef.current.state === "paused"
        ) {
          transportRef.current.send({
            type: "session_stop",
            sessionId,
            therapistId: therapistId || "current-therapist",
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
    if (transportRef.current) {
      try {
        transportRef.current.send({
          type: "session_pause",
          sessionId,
          therapistId: therapistId || "current-therapist",
          timestamp: Date.now(),
        });
      } catch {
        // ignore
      }
    }
    setState("paused");
  }, [sessionId, therapistId]);

  const handleResume = useCallback(() => {
    if (transportRef.current) {
      try {
        transportRef.current.send({
          type: "session_resume",
          sessionId,
          therapistId: therapistId || "current-therapist",
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
    setState("connecting");

    const effectiveTherapistId = therapistId || "current-therapist";
    sequenceCounterRef.current = 0;

    // 1. Instanciar e Conectar WebSocketAudioTransport
    const transport = new WebSocketAudioTransport(
      {
        sessionId,
        therapistId: effectiveTherapistId,
        patientId,
        endpointUrl,
        autoReconnect: true,
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
          }
        },
      }
    );

    transportRef.current = transport;

    try {
      await transport.connect();

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
          timeSliceMs: 4000,
          sampleRate: 16000,
          channelCount: 1,
        },
        {
          onChunk: async (chunk: AudioChunk) => {
            if (!isStartedRef.current || !transportRef.current) return;
            try {
              const base64Data = await audioChunkToBase64(chunk.blob);
              sequenceCounterRef.current += 1;

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
      await capture.start();

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
  }, [sessionId, therapistId, patientId, endpointUrl, onError, handleStop]);

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
