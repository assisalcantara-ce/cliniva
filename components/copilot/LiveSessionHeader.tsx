"use client";

import React, { useEffect, useState } from "react";
import type { ConnectionState } from "./useCopilotStream";

interface LiveSessionHeaderProps {
  patientName?: string | null;
  sessionId: string;
  streamState: ConnectionState;
  startTime?: Date | null;
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
}

export function LiveSessionHeader({
  patientName,
  sessionId,
  streamState,
  startTime,
  onPause,
  onResume,
  onEndSession,
}: LiveSessionHeaderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime.getTime()) / 1000));
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    switch (streamState) {
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Conectando
          </span>
        );
      case "listening":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
            Ouvindo em tempo real
          </span>
        );
      case "transcribing":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            <span className="h-2 w-2 animate-ping rounded-full bg-teal-600" />
            Transcrevendo...
          </span>
        );
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Conectado
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Pausado
          </span>
        );
      case "reconnecting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
            <span className="h-2 w-2 animate-ping rounded-full bg-orange-500" />
            Reconectando...
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Desconectado
          </span>
        );
      case "ended":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Encerrado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">
              {patientName ? patientName : "Atendimento Clínico"}
            </h1>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground">Sessão: {sessionId}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {startTime && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-mono font-medium text-foreground">
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        )}

        {streamState === "paused" ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Retomar
          </button>
        ) : (
          onPause && (
            <button
              type="button"
              onClick={onPause}
              disabled={streamState !== "connected" && streamState !== "transcribing"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Pausar
            </button>
          )
        )}

        <button
          type="button"
          onClick={onEndSession}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          Encerrar Sessão
        </button>
      </div>
    </header>
  );
}
