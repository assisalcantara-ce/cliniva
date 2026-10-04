"use client";

import React, { useState, useCallback, useEffect } from "react";
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

  // Connect to SSE stream and preload existing transcripts if any
  const stream = useCopilotStream(mode === "LIVE" ? sessionId : null, {
    initialChunks,
  });

  // Connect to Realtime Audio Capture & WebSocket Transport
  const audio = useCopilotAudio({
    sessionId,
    enabled: mode === "LIVE",
  });

  const handleStartSession = useCallback(() => {
    setSessionStartTime(new Date());
    setMode("LIVE");
  }, []);

  const handleEndSession = useCallback(() => {
    audio.stop();
    setMode("POST_SESSION");
  }, [audio]);

  const handlePauseSession = useCallback(() => {
    audio.pause();
  }, [audio]);

  const handleResumeSession = useCallback(() => {
    audio.resume();
  }, [audio]);

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
    try {
      const res = await fetch(`/api/sessions/${sessionId}/insights/generate`, {
        method: "POST",
      });
      if (res.ok) {
        const json = (await res.json()) as { package?: InsightsPackage };
        if (json.package) {
          setInsights(json.package);
        }
      }
    } catch {
      // ignore
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

  return (
    <PostSessionView
      sessionId={sessionId}
      patientName={patientName}
      patientMemory={patientMemory}
      insights={insights}
      isGenerating={isGeneratingInsights}
      onGenerateFullInsights={handleGenerateFullInsights}
      onFinishAndLeave={handleFinishAndLeave}
    />
  );
}
