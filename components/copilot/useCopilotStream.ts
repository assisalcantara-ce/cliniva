"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CopilotEvent } from "@/lib/copilot/types";
import type { SSEEvent, TranscriptFinalEvent } from "@/lib/copilot/realtime/broker/types";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "listening"
  | "transcribing"
  | "paused"
  | "reconnecting"
  | "error"
  | "ended";

export interface RealtimeTranscriptItem {
  id: string;
  text: string;
  speaker?: string;
  isFinal: boolean;
  sequenceNumber?: number;
  tStartSeconds?: number;
  tEndSeconds?: number;
  timestamp: number;
}

export interface CopilotEventItem extends CopilotEvent {
  isDismissed?: boolean;
  isPinned?: boolean;
}

export interface UseCopilotStreamOptions {
  maxTranscriptsWindow?: number;
  maxActiveEvents?: number;
  initialChunks?: RealtimeTranscriptItem[];
}

export interface UseCopilotStreamResult {
  connectionState: ConnectionState;
  transcripts: RealtimeTranscriptItem[];
  interimTranscript: string | null;
  copilotEvents: CopilotEventItem[];
  activeCopilotEvents: CopilotEventItem[];
  lastError: string | null;
  dismissEvent: (eventId: string) => void;
  pinEvent: (eventId: string) => void;
  clearTranscripts: () => void;
  reconnect: () => void;
}

/**
 * Hook React para consumo de eventos em tempo real do Copilot via SSE.
 * 
 * Rota: GET /api/sessions/[id]/copilot/stream
 */
export function useCopilotStream(
  sessionId: string | null | undefined,
  options?: UseCopilotStreamOptions
): UseCopilotStreamResult {
  const maxTranscriptsWindow = options?.maxTranscriptsWindow ?? 50;
  const maxActiveEvents = options?.maxActiveEvents ?? 3;
  const initialChunks = options?.initialChunks;

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [transcripts, setTranscripts] = useState<RealtimeTranscriptItem[]>(() => initialChunks ?? []);
  const [interimTranscript, setInterimTranscript] = useState<string | null>(null);
  const [copilotEvents, setCopilotEvents] = useState<CopilotEventItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectTrigger, setConnectTrigger] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyClosedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;

    isManuallyClosedRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sseUrl = `/api/sessions/${encodeURIComponent(sessionId)}/copilot/stream`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionState("connected");
      setLastError(null);
    };

    es.onerror = () => {
      if (isManuallyClosedRef.current) return;
      setConnectionState("reconnecting");
      es.close();

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isManuallyClosedRef.current) {
          setConnectTrigger((prev) => prev + 1);
        }
      }, 3000);
    };

    const handleIncomingEvent = (eventPayload: SSEEvent) => {
      switch (eventPayload.type) {
        case "connection_ready":
          setConnectionState("connected");
          break;

        case "transcript_interim":
          setConnectionState("transcribing");
          setInterimTranscript(eventPayload.text);
          break;

        case "transcript_final": {
          setConnectionState("connected");
          setInterimTranscript(null);
          const finalEv = eventPayload as TranscriptFinalEvent;
          const newItem: RealtimeTranscriptItem = {
            id: finalEv.chunkId,
            text: finalEv.text,
            speaker: finalEv.speaker,
            isFinal: true,
            sequenceNumber: finalEv.sequenceNumber,
            tStartSeconds: finalEv.tStartSeconds,
            tEndSeconds: finalEv.tEndSeconds,
            timestamp: finalEv.timestamp,
          };

          setTranscripts((prev) => {
            if (prev.some((p) => p.id === newItem.id)) return prev;
            const updated = [...prev, newItem];
            return updated.slice(-maxTranscriptsWindow);
          });
          break;
        }

        case "copilot_event": {
          const newCopilotEv: CopilotEventItem = {
            ...eventPayload.event,
            isDismissed: false,
            isPinned: false,
          };

          setCopilotEvents((prev) => {
            if (prev.some((p) => p.id === newCopilotEv.id)) return prev;
            return [newCopilotEv, ...prev];
          });
          break;
        }

        case "session_status":
          if (eventPayload.status === "paused") setConnectionState("paused");
          if (eventPayload.status === "resumed") setConnectionState("connected");
          if (eventPayload.status === "ended") setConnectionState("ended");
          break;

        case "pipeline_error":
          setLastError(eventPayload.error);
          break;

        case "heartbeat":
          break;
      }
    };

    const eventTypes: SSEEvent["type"][] = [
      "connection_ready",
      "transcript_interim",
      "transcript_final",
      "copilot_event",
      "pipeline_error",
      "session_status",
      "heartbeat",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as SSEEvent;
          handleIncomingEvent(parsed);
        } catch {
          // ignore corrupted event data
        }
      });
    }

    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId, maxTranscriptsWindow, connectTrigger]);

  const dismissEvent = useCallback((eventId: string) => {
    setCopilotEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, isDismissed: true } : ev))
    );
  }, []);

  const pinEvent = useCallback((eventId: string) => {
    setCopilotEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, isPinned: !ev.isPinned } : ev))
    );
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setInterimTranscript(null);
  }, []);

  const reconnect = useCallback(() => {
    isManuallyClosedRef.current = false;
    setConnectTrigger((prev) => prev + 1);
  }, []);

  // Filtra cards ativos (não dispensados), priorizando fixados e limitando a maxActiveEvents (default 3)
  const activeCopilotEvents = copilotEvents
    .filter((ev) => !ev.isDismissed)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, maxActiveEvents);

  return {
    connectionState,
    transcripts,
    interimTranscript,
    copilotEvents,
    activeCopilotEvents,
    lastError,
    dismissEvent,
    pinEvent,
    clearTranscripts,
    reconnect,
  };
}
