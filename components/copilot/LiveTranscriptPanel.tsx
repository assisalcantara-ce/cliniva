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
  const isError = streamState === "error";
  const isConnecting = streamState === "connecting" || streamState === "reconnecting";
  const isListening = streamState === "listening" || streamState === "transcribing" || streamState === "connected";
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
            {/* Ícone contextual de acordo com o status real */}
            <div className="relative flex items-center justify-center mb-6">
              {isListening && !effectivePaused && (
                <div className="absolute h-32 w-32 rounded-full bg-teal-50 border border-teal-100 animate-ping opacity-30" />
              )}
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border shadow-xs ${
                  isError
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : isConnecting
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-gradient-to-b from-teal-50 to-teal-100/70 border-teal-200 text-teal-700"
                }`}
              >
                {isError ? (
                  <svg className="h-8 w-8 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 3v18M8 7v10M16 7v10M4 11v2M20 11v2" />
                  </svg>
                )}
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-800">
              {isError
                ? "Microfone ou conexão indisponível"
                : isConnecting
                ? "Conectando ao serviço de áudio..."
                : effectivePaused
                ? "Sessão pausada"
                : "Aguardando primeiras falas..."}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              {isError
                ? "Verifique a permissão do microfone no navegador e certifique-se de que o Realtime Gateway está ativo."
                : isConnecting
                ? "Estabelecendo canal seguro WebSocket com o Gateway de áudio..."
                : effectivePaused
                ? "A captura de áudio está temporariamente suspensa. Clique em 'Retomar' para continuar."
                : "O microfone está ativo. À medida que o terapeuta e o paciente conversarem, as falas aparecerão aqui em tempo real."}
            </p>

            {/* Barras de som animadas SOMENTE se a escuta estiver ativa de fato */}
            {isListening && !effectivePaused && (
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
