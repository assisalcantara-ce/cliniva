"use client";

import React from "react";
import { LiveSessionHeader } from "./LiveSessionHeader";
import { LiveTranscriptPanel } from "./LiveTranscriptPanel";
import { CopilotFeedPanel } from "./CopilotFeedPanel";
import type { ConnectionState, RealtimeTranscriptItem, CopilotEventItem } from "./useCopilotStream";

interface LiveSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  streamState: ConnectionState;
  startTime?: Date | null;
  transcripts: RealtimeTranscriptItem[];
  events: CopilotEventItem[];
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
  onDismissEvent: (eventId: string) => void;
  onTogglePinEvent: (eventId: string) => void;
}

export function LiveSessionView({
  sessionId,
  patientName,
  streamState,
  startTime,
  transcripts,
  events,
  onPause,
  onResume,
  onEndSession,
  onDismissEvent,
  onTogglePinEvent,
}: LiveSessionViewProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Header */}
      <LiveSessionHeader
        sessionId={sessionId}
        patientName={patientName}
        streamState={streamState}
        startTime={startTime}
        onPause={onPause}
        onResume={onResume}
        onEndSession={onEndSession}
      />

      {/* Main Split Grid: 60% Transcript / 40% Copilot Feed */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Live Transcript (60% ~ 7/12 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 border-r border-border bg-card">
          <LiveTranscriptPanel transcripts={transcripts} />
        </div>

        {/* Right Column: Discrete Copilot Feed (40% ~ 5/12 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 bg-muted/20">
          <CopilotFeedPanel
            events={events}
            onDismiss={onDismissEvent}
            onPin={onTogglePinEvent}
          />
        </div>
      </div>
    </div>
  );
}
