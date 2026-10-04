"use client";

import React from "react";
import type { RealtimeTranscriptItem } from "./useCopilotStream";

export interface TranscriptBubbleProps {
  item: RealtimeTranscriptItem;
  isLatest?: boolean;
  patientName?: string | null;
  therapistName?: string | null;
}

function formatTime(timestampOrSec?: number): string {
  if (timestampOrSec === undefined || timestampOrSec === null) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  // Se for timestamp Unix em milissegundos
  if (timestampOrSec > 1000000) {
    const d = new Date(timestampOrSec);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // Se for relativo em segundos da sessão
  const mins = Math.floor(timestampOrSec / 60);
  const secs = Math.floor(timestampOrSec % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PZ";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const TranscriptBubble: React.FC<TranscriptBubbleProps> = React.memo(
  ({ item, isLatest = false, patientName = "Maria Zilda", therapistName = "Dra. Cristiane" }) => {
    const speakerLower = (item.speaker || "").toLowerCase();
    const isTherapist =
      speakerLower.includes("terapeuta") ||
      speakerLower.includes("cristiane") ||
      speakerLower.includes("dra");

    const isInterim = !item.isFinal;
    const timeLabel = formatTime(item.tStartSeconds || item.timestamp);
    const speakerDisplayName = isTherapist ? (therapistName || "Dra. Cristiane") : (patientName || "Maria Zilda");
    const initials = isTherapist ? getInitials(therapistName || "DC") : getInitials(patientName || "MZ");

    return (
      <div
        className={`flex items-start gap-3.5 transition-all duration-200 ${
          isInterim ? "opacity-80" : "opacity-100"
        } ${isLatest ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""}`}
        aria-live={isInterim ? "off" : "polite"}
      >
        {/* Avatar Circular com Iniciais */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-xs shadow-2xs ${
            isTherapist
              ? "bg-blue-100 text-blue-800 ring-2 ring-blue-200/50"
              : "bg-teal-100 text-teal-800 ring-2 ring-teal-200/50"
          }`}
        >
          {initials}
        </div>

        {/* Bloco da Mensagem com Header e Texto */}
        <div
          className={`flex-1 rounded-2xl p-4 transition-all duration-150 shadow-2xs ${
            isTherapist
              ? "bg-[#F5F8FC] border border-blue-100/80 text-slate-800"
              : isInterim
              ? "bg-[#F2FBF9]/60 border border-dashed border-teal-200 text-slate-700 italic"
              : "bg-[#F2FBF9] border border-teal-100/80 text-slate-800"
          }`}
        >
          {/* Header do Balão: Nome + Timestamp */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {speakerDisplayName}
            </span>
            <span className="text-[11px] font-medium text-slate-600">
              · {timeLabel}
            </span>
            {isInterim && (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-semibold text-teal-700 border border-teal-200">
                ouvindo...
              </span>
            )}
          </div>

          {/* Texto Transcrito */}
          <p className="text-sm leading-relaxed text-slate-800 font-normal">
            {item.text}
          </p>
        </div>
      </div>
    );
  }
);

TranscriptBubble.displayName = "TranscriptBubble";
