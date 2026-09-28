"use client";

import React from "react";
import { LiveSessionHeader } from "./LiveSessionHeader";
import { LiveTranscriptPanel } from "./LiveTranscriptPanel";
import { CopilotFeedPanel } from "./CopilotFeedPanel";
import type { ConnectionState, RealtimeTranscriptItem, CopilotEventItem } from "./useCopilotStream";

interface LiveSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  streamState: ConnectionState;
  startTime?: Date | null;
  transcripts: RealtimeTranscriptItem[];
  events: CopilotEventItem[];
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
  onDismissEvent: (eventId: string) => void;
  onTogglePinEvent: (eventId: string) => void;
  onBack?: () => void;
}

export function LiveSessionView({
  sessionId,
  patientName,
  patientMemory,
  lastSessionDate,
  streamState,
  startTime,
  transcripts,
  events,
  onPause,
  onResume,
  onEndSession,
  onDismissEvent,
  onTogglePinEvent,
  onBack,
}: LiveSessionViewProps) {
  const isPaused = streamState === "paused";

  const handleTogglePause = () => {
    if (isPaused) {
      onResume?.();
    } else {
      onPause?.();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-slate-100/80 overflow-hidden">
      {/* Header da Sessão */}
      <LiveSessionHeader
        sessionId={sessionId}
        patientName={patientName}
        streamState={streamState}
        startTime={startTime}
        onPause={onPause}
        onResume={onResume}
        onEndSession={onEndSession}
        onBack={onBack}
      />

      {/* Área de Trabalho: 2 Cards Flutuantes Independentes com Respiro */}
      <div className="flex-1 min-h-0 w-full p-4 sm:p-5 lg:p-6 overflow-hidden">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 min-h-0">
          {/* CARD 1: Transcrição ao Vivo (60% ~ 7 cols) */}
          <div className="lg:col-span-7 h-full min-h-0 min-w-0 flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <LiveTranscriptPanel
              transcripts={transcripts}
              streamState={streamState}
              onTogglePause={handleTogglePause}
            />
          </div>

          {/* CARD 2: Copilot Assistivo (40% ~ 5 cols) */}
          <div className="lg:col-span-5 h-full min-h-0 min-w-0 flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <CopilotFeedPanel
              events={events}
              patientName={patientName}
              patientMemory={patientMemory}
              lastSessionDate={lastSessionDate}
              onDismiss={onDismissEvent}
              onPin={onTogglePinEvent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

