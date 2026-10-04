"use client";

import React, { useEffect, useState } from "react";
import type { ConnectionState } from "./useCopilotStream";

export interface LiveSessionHeaderProps {
  patientName?: string | null;
  sessionId: string;
  streamState: ConnectionState;
  startTime?: Date | null;
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
  onBack?: () => void;
  onOpenContext?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "MZ";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LiveSessionHeader({
  patientName,
  streamState,
  startTime,
  onPause,
  onResume,
  onEndSession,
  onBack,
  onOpenContext,
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

  const isPaused = streamState === "paused";
  const initials = getInitials(patientName);
  const displayName = patientName || "Maria Zilda";

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200/80 shadow-2xs shrink-0 select-none">
      {/* 1. Esquerda: Voltar + Avatar + Nome + Subtítulo */}
      <div className="flex items-center gap-3.5 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            aria-label="Voltar para sessões"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100/90 text-teal-800 font-bold text-xs ring-2 ring-teal-200/40 shadow-2xs">
            {initials}
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
              {displayName}
            </h1>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Sessão de terapia
            </p>
          </div>
        </div>
      </div>

      {/* 2. Centro: Status da Sessão + Timer de Alta Visibilidade */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span
            className={`h-2 w-2 rounded-full ${
              isPaused ? "bg-amber-400" : "bg-emerald-500 animate-pulse"
            }`}
          />
          <span>{isPaused ? "Sessão pausada" : "Sessão em andamento"}</span>
        </div>
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums leading-none mt-0.5">
          {formatTimer(elapsedSeconds)}
        </span>
      </div>

      {/* 3. Direita: Contexto do Paciente + Pausar + Encerrar */}
      <div className="flex items-center gap-2.5">
        {onOpenContext && (
          <button
            type="button"
            onClick={onOpenContext}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span>Contexto do paciente</span>
            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={isPaused ? onResume : onPause}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
          title={isPaused ? "Retomar sessão" : "Pausar sessão"}
        >
          {isPaused ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Retomar</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span>Pausar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onEndSession}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
        >
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
          <span>Encerrar sessão</span>
        </button>
      </div>
    </header>
  );
}
