"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PreSessionView } from "./PreSessionView";
import { LiveSessionView } from "./LiveSessionView";
import { PostSessionView } from "./PostSessionView";
import { useCopilotStream, type RealtimeTranscriptItem } from "./useCopilotStream";
import { useCopilotAudio } from "./useCopilotAudio";
import type { InsightsPackage } from "@/components/InsightCards";

export type SessionMode = "PRE_SESSION" | "LIVE" | "POST_SESSION";

interface SessionWorkspaceProps {
  sessionId: string;
  therapistId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  initialMode?: SessionMode;
  initialInsights?: InsightsPackage | null;
  initialChunks?: RealtimeTranscriptItem[];
  isResuming?: boolean;
}

export function SessionWorkspace({
  sessionId,
  therapistId,
  patientId,
  patientName,
  patientMemory,
  lastSessionDate,
  initialMode = "PRE_SESSION",
  initialInsights = null,
  initialChunks,
  isResuming = false,
}: SessionWorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [insights, setInsights] = useState<InsightsPackage | null>(initialInsights);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [captureEnabled, setCaptureEnabled] = useState(false);

  // Connect to SSE stream and preload existing transcripts if any
  const stream = useCopilotStream(mode === "LIVE" ? sessionId : null, {
    initialChunks,
  });

  const persistedChunksRef = useRef<Set<string>>(new Set());

  const handlePersistFinalTranscript = useCallback(
    async (text: string, chunkId: string) => {
      if (!text || !text.trim()) return;
      if (chunkId && persistedChunksRef.current.has(chunkId)) return;
      if (chunkId) persistedChunksRef.current.add(chunkId);

      try {
        await fetch(`/api/sessions/${sessionId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chunk_id: chunkId && chunkId.includes("-") ? chunkId : undefined,
            text: text.trim(),
            speaker: patientName || "Paciente",
          }),
        });
      } catch (err) {
        console.error("[SessionWorkspace] Falha ao persistir transcript:", err);
      }
    },
    [sessionId, patientName]
  );

  const handleFinalTranscriptFromAudio = useCallback(
    (text: string, chunkId: string) => {
      // 1. Atualiza visualização imediatamente na UI sem esperar SSE
      stream.addExternalTranscript({
        id: chunkId,
        text,
        speaker: patientName || "Paciente",
        timestamp: Date.now(),
      });

      // 2. Persiste no banco de dados com idempotência
      void handlePersistFinalTranscript(text, chunkId);
    },
    [stream, patientName, handlePersistFinalTranscript]
  );

  const handleCopilotEventFromAudio = useCallback(
    (event: import("@/lib/copilot/types").CopilotEvent) => {
      // Atualiza o feed de eventos imediatamente com o card assistivo
      stream.addExternalEvent(event);
    },
    [stream]
  );

  // Connect to Realtime Audio Capture & WebSocket Transport
  const audio = useCopilotAudio({
    sessionId,
    therapistId: therapistId || undefined,
    patientId: patientId || undefined,
    enabled: captureEnabled,
    onFinalTranscript: handleFinalTranscriptFromAudio,
    onCopilotEvent: handleCopilotEventFromAudio,
  });

  const handleStartSession = useCallback(() => {
    setSessionStartTime(new Date());
    setMode("LIVE");
  }, []);

  const handleEndSession = useCallback(async () => {
    audio.stop();
    setCaptureEnabled(false);
    setMode("POST_SESSION");

    // Persiste ended_at no banco para marcar a sessão como encerrada
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("[SessionWorkspace] Erro ao registrar encerramento:", err);
    }
  }, [audio, sessionId]);

  const handlePauseSession = useCallback(() => {
    if (captureEnabled) {
      audio.pause();
    }
  }, [audio, captureEnabled]);

  const handleResumeSession = useCallback(() => {
    audio.resume();
  }, [audio]);

  const handleStartCapture = useCallback(() => {
    setCaptureEnabled(true);
  }, []);

  const handleFinishAndLeave = useCallback(async () => {
    try {
      await fetch(`/api/sessions/${sessionId}/memory/consolidate`, {
        method: "POST",
      });
    } catch (err) {
      console.error("[SessionWorkspace] Erro ao consolidar memória da sessão:", err);
    } finally {
      if (patientId) {
        router.push(`/patients/${patientId}`);
      } else {
        router.push("/patients");
      }
    }
  }, [sessionId, patientId, router]);

  const handleGenerateFullInsights = useCallback(async () => {
    setIsGeneratingInsights(true);
    setInsightsError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/insights/generate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.package) {
        setInsights(json.package);
      } else {
        const errorMsg = json.error || "Falha ao gerar síntese clínica da sessão.";
        setInsightsError(errorMsg);
      }
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Erro de conexão ao gerar síntese.");
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [sessionId]);

  // If initialInsights arrives later or is populated
  useEffect(() => {
    if (initialInsights) {
      setInsights(initialInsights);
    }
  }, [initialInsights]);

  // Derivar o estado composto de conexão/gravação
  const effectiveState =
    audio.state === "error"
      ? "error"
      : audio.state === "paused"
      ? "paused"
      : audio.state === "listening"
      ? stream.connectionState === "transcribing"
        ? "transcribing"
        : "listening"
      : audio.state === "reconnecting" || stream.connectionState === "reconnecting"
      ? "reconnecting"
      : stream.connectionState;

  if (mode === "PRE_SESSION") {
    return (
      <PreSessionView
        sessionId={sessionId}
        patientId={patientId}
        patientName={patientName}
        patientMemory={patientMemory}
        lastSessionDate={lastSessionDate}
        isResuming={isResuming}
        onStartSession={handleStartSession}
        onBack={() => router.push("/sessions")}
      />
    );
  }

  if (mode === "LIVE") {
    return (
      <LiveSessionView
        sessionId={sessionId}
        patientName={patientName}
        patientMemory={patientMemory}
        lastSessionDate={lastSessionDate}
        streamState={effectiveState}
        startTime={sessionStartTime}
        transcripts={stream.transcripts}
        interimTranscript={stream.interimTranscript}
        events={stream.activeCopilotEvents}
        captureEnabled={captureEnabled}
        audioState={audio.state}
        onStartCapture={handleStartCapture}
        onPause={handlePauseSession}
        onResume={handleResumeSession}
        onEndSession={handleEndSession}
        onDismissEvent={stream.dismissEvent}
        onTogglePinEvent={stream.pinEvent}
        onBack={() => {
          if (patientId) {
            router.push(`/patients/${patientId}`);
          } else {
            router.push("/patients");
          }
        }}
      />
    );
  }

  const hasAnyTranscripts = stream.transcripts.length > 0 || (initialChunks && initialChunks.length > 0);

  return (
    <PostSessionView
      sessionId={sessionId}
      patientName={patientName}
      patientMemory={patientMemory}
      insights={insights}
      isGenerating={isGeneratingInsights}
      error={insightsError}
      hasTranscript={Boolean(hasAnyTranscripts)}
      onGenerateFullInsights={handleGenerateFullInsights}
      onFinishAndLeave={handleFinishAndLeave}
    />
  );
}
