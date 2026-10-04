"use client";

import React, { useEffect, useRef } from "react";
import { TranscriptBubble } from "./TranscriptBubble";
import type { ConnectionState, RealtimeTranscriptItem } from "./useCopilotStream";

export interface LiveTranscriptPanelProps {
  transcripts: RealtimeTranscriptItem[];
  interimTranscript?: string | null;
  patientName?: string | null;
  therapistName?: string | null;
  className?: string;
  isPaused?: boolean;
  streamState?: ConnectionState;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcripts,
  interimTranscript,
  patientName = "Maria Zilda",
  therapistName = "Dra. Cristiane",
  className = "",
  isPaused = false,
  streamState,
}) => {
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const effectivePaused = isPaused || streamState === "paused";
  const displayName = patientName || "Maria Zilda";

  // Auto-scroll suave para o final quando chegam novas falas
  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [transcripts.length, interimTranscript]);

  const isSpeaking = Boolean(interimTranscript && interimTranscript.trim().length > 0);

  return (
    <div className={`flex h-full w-full min-w-0 flex-col bg-white overflow-hidden ${className}`}>
      {/* Área Central de Transcrição com Scroll Suave */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-white scrollbar-thin"
        role="log"
        aria-live="polite"
        aria-label="Transcrição da sessão em tempo real"
      >
        {transcripts.length === 0 && !interimTranscript ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center p-8 select-none">
            {/* Animação suave de áudio */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute h-32 w-32 rounded-full bg-teal-50 border border-teal-100 animate-ping opacity-30" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-teal-50 to-teal-100/70 border border-teal-200 text-teal-700 shadow-xs">
                <svg className="h-8 w-8 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 3v18M8 7v10M16 7v10M4 11v2M20 11v2" />
                </svg>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-800">
              {effectivePaused ? "Sessão pausada" : "Escuta ativa iniciada..."}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              O áudio da conversa está sendo transcrito com privacidade e sigilo em tempo real. Converse naturalmente com o paciente.
            </p>

            {/* Barras de som animadas */}
            {!effectivePaused && (
              <div className="flex items-center gap-1.5 mt-6 h-6">
                {[8, 14, 22, 16, 10, 18, 12, 6, 14, 20, 10, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-teal-500/70 animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 0.12}s`,
                      animationDuration: "1.1s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {transcripts.map((item, idx) => (
              <TranscriptBubble
                key={item.id || `chunk-${idx}`}
                item={item}
                patientName={displayName}
                therapistName={therapistName}
                isLatest={idx === transcripts.length - 1}
              />
            ))}

            {/* Interim Transcript em Tempo Real */}
            {interimTranscript && (
              <TranscriptBubble
                item={{
                  id: "interim-current",
                  text: interimTranscript,
                  speaker: displayName,
                  isFinal: false,
                  timestamp: 0,
                }}
                patientName={displayName}
                therapistName={therapistName}
                isLatest
              />
            )}

            {/* Indicador Ativo: ••• Maria Zilda está falando... */}
            {isSpeaking && (
              <div className="flex items-center gap-2.5 rounded-full border border-teal-100 bg-[#F2FBF9] px-4 py-2 text-xs font-semibold text-teal-800 w-fit shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>{displayName} está falando...</span>
              </div>
            )}

            <div ref={bottomAnchorRef} />
          </div>
        )}
      </div>
    </div>
  );
};
