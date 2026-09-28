"use client";

import React, { useEffect, useState } from "react";
import type { ConnectionState } from "./useCopilotStream";

interface LiveSessionHeaderProps {
  patientName?: string | null;
  sessionId: string;
  streamState: ConnectionState;
  startTime?: Date | null;
  therapistName?: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onEndSession: () => void;
  onBack?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatSessionStartTime(d?: Date | null): string {
  const date = d || new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function LiveSessionHeader({
  patientName,
  sessionId,
  streamState,
  startTime,
  therapistName = "Dra. Cristiane",
  onPause,
  onResume,
  onEndSession,
  onBack,
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
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isPaused = streamState === "paused";
  const initials = getInitials(patientName);
  const displayName = patientName || "Paciente em Atendimento";
  const therapistInitials = getInitials(therapistName);

  return (
    <div className="flex flex-col border-b border-slate-200/90 bg-white shadow-2xs shrink-0">
      {/* LINHA 1: Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Voltar
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold ring-2 ring-slate-100">
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Em atendimento
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground truncate max-w-xs sm:max-w-md">
                Sessão • {sessionId}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Copiloto Premium ativado
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
              {therapistInitials}
            </div>
            <span className="hidden md:inline font-semibold">{therapistName}</span>
          </div>
        </div>
      </div>

      {/* LINHA 2: Metrics Cards & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Início */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Início</span>
              <span className="text-xs font-semibold text-slate-800">{formatSessionStartTime(startTime)}</span>
            </div>
          </div>

          {/* Duração */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Duração</span>
              <span className="text-xs font-mono font-bold text-slate-900">{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
              <span className="text-xs font-semibold text-slate-800">{isPaused ? "Pausado" : "Em andamento"}</span>
            </div>
          </div>

          {/* Modo */}
          <div className="hidden lg:flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="12" x2="12" y2="19" />
              </svg>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modo</span>
              <span className="text-xs font-semibold text-slate-800">Escuta e Transcrição</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-teal-700" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Retomar
            </button>
          ) : (
            onPause && (
              <button
                type="button"
                onClick={onPause}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Encerrar Sessão
          </button>
        </div>
      </div>
    </div>
  );
}
