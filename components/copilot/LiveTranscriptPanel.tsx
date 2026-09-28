"use client";

import React, { useEffect, useRef, useState } from "react";
import { TranscriptBubble } from "./TranscriptBubble";
import type { ConnectionState, RealtimeTranscriptItem } from "./useCopilotStream";

export interface LiveTranscriptPanelProps {
  transcripts: RealtimeTranscriptItem[];
  interimTranscript?: string | null;
  className?: string;
  isPaused?: boolean;
  streamState?: ConnectionState;
  onTogglePause?: () => void;
  onAddQuickNote?: (note: string) => void;
  onBookmarkTopic?: () => void;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcripts,
  interimTranscript,
  className = "",
  isPaused = false,
  streamState,
  onTogglePause,
  onAddQuickNote,
  onBookmarkTopic,
}) => {
  const effectivePaused = isPaused || streamState === "paused";
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [topicMarkedToast, setTopicMarkedToast] = useState(false);

  // Auto-scroll suave para o final quando chegam novas falas
  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [transcripts.length, interimTranscript]);

  const handleMarkTopic = () => {
    if (onBookmarkTopic) {
      onBookmarkTopic();
    }
    setTopicMarkedToast(true);
    setTimeout(() => setTopicMarkedToast(false), 2500);
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;
    if (onAddQuickNote) {
      onAddQuickNote(quickNoteText.trim());
    }
    setQuickNoteText("");
    setQuickNoteOpen(false);
  };

  return (
    <div className={`flex h-full w-full min-w-0 flex-col bg-white overflow-hidden ${className}`}>
      {/* 1. Header do Card de Transcrição */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Transcrição ao Vivo
            </h2>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            {effectivePaused ? "Pausado" : "Gravando"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span>{transcripts.length} {transcripts.length === 1 ? "fala registrada" : "falas registradas"}</span>
          </span>
        </div>
      </div>

      {/* 2. Área Central de Transcrição */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white scrollbar-none"
        role="log"
        aria-live="polite"
        aria-label="Transcrição da sessão em tempo real"
      >
        {transcripts.length === 0 && !interimTranscript ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-6 select-none">
            {/* Concentric glowing audio wave icon */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute h-36 w-36 rounded-full bg-teal-50/50 border border-teal-100 animate-ping opacity-25" />
              <div className="absolute h-28 w-28 rounded-full bg-teal-100/40 border border-teal-200" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-teal-50 to-teal-100 border border-teal-300 shadow-sm text-teal-700">
                <svg className="h-9 w-9 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 3v18M8 7v10M16 7v10M4 11v2M20 11v2" />
                </svg>
              </div>
            </div>

            <h3 className="text-base font-bold text-foreground">
              Aguardando a sua fala...
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
              O áudio está sendo transcrito em tempo real.<br />
              Converse normalmente com o paciente.
            </p>

            {/* Visualizer animation bars */}
            <div className="flex items-center gap-1 mt-6 h-6">
              {[6, 12, 18, 24, 16, 10, 20, 14, 8, 12, 16, 8, 4].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-teal-500/60 animate-pulse"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "1.2s",
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {transcripts.map((item, idx) => (
              <TranscriptBubble
                key={item.id || `chunk-${idx}`}
                item={item}
                isLatest={idx === transcripts.length - 1}
              />
            ))}

            {interimTranscript && (
              <TranscriptBubble
                item={{
                  id: "interim-current",
                  text: interimTranscript,
                  speaker: "Em andamento",
                  isFinal: false,
                  timestamp: 0,
                }}
                isLatest
              />
            )}
            <div ref={bottomAnchorRef} />
          </div>
        )}
      </div>

      {/* Popover / Toast de nota ou tópico */}
      {topicMarkedToast && (
        <div className="mx-6 mb-2 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs text-teal-800 font-semibold flex items-center justify-between animate-in fade-in">
          <span>Tópico clínico marcado na linha do tempo</span>
          <span className="text-teal-600 font-bold">✓</span>
        </div>
      )}

      {quickNoteOpen && (
        <form onSubmit={handleSaveQuickNote} className="mx-6 mb-3 rounded-xl border border-border bg-card p-3 shadow-md space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Anotação Rápida da Sessão</span>
            <button
              type="button"
              onClick={() => setQuickNoteOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
          <textarea
            rows={2}
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
            placeholder="Digite uma observação rápida sobre este momento..."
            className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-600"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQuickNoteOpen(false)}
              className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Salvar Nota
            </button>
          </div>
        </form>
      )}

      {/* 3. Barra Inferior Fixa com Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Microfone Ativo */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onTogglePause}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all shadow-2xs cursor-pointer ${
                effectivePaused
                  ? "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200"
                  : "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 ring-2 ring-teal-200"
              }`}
              title={effectivePaused ? "Microfone pausado" : "Microfone ativo"}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <span className={`text-[10px] font-semibold ${effectivePaused ? "text-slate-500" : "text-teal-700"}`}>
              {effectivePaused ? "Pausado" : "Microfone ativo"}
            </span>
          </div>

          {/* Pausar */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onTogglePause}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
              title={effectivePaused ? "Retomar áudio" : "Pausar áudio"}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                {effectivePaused ? (
                  <polygon points="5 3 19 12 5 21 5 3" />
                ) : (
                  <>
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </>
                )}
              </svg>
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              {effectivePaused ? "Retomar" : "Pausar"}
            </span>
          </div>

          {/* Marcar Tópico */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleMarkTopic}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
              title="Marcar momento clínico relevante"
            >
              <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              Marcar tópico
            </span>
          </div>

          {/* Adicionar Nota Rápida */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickNoteOpen(!quickNoteOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
              title="Escrever anotação rápida"
            >
              <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              Adicionar nota
            </span>
          </div>
        </div>

        {/* Right Info Pill Banner */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-teal-200/80 bg-teal-50/70 px-3.5 py-2 text-xs text-teal-900 shadow-2xs">
          <svg className="h-4 w-4 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 3v18M8 7v10M16 7v10M4 11v2M20 11v2" />
          </svg>
          <span className="font-medium text-[11px]">
            Áudio capturado em tempo real
          </span>
          <span className="text-teal-600 font-bold ml-1">ⓘ</span>
        </div>
      </div>
    </div>
  );
};
