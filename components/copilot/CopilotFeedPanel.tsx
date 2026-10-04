"use client";

import React, { useState } from "react";
import type { CopilotEventItem } from "./useCopilotStream";

export interface CopilotFeedPanelProps {
  events: CopilotEventItem[];
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  onDismiss?: (id: string) => void;
  onPin?: (id: string) => void;
  onOpenContextSection?: (section?: string) => void;
  className?: string;
}

function formatTime(createdAt?: string | number): string {
  if (!createdAt) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const CopilotFeedPanel: React.FC<CopilotFeedPanelProps> = ({
  events = [],
  onDismiss,
  onOpenContextSection,
  className = "",
}) => {
  const [usedSuggestions, setUsedSuggestions] = useState<Record<string, boolean>>({});
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Filtra eventos ativos (não dispensados)
  const activeEvents = events.filter((e) => !e.isDismissed);

  const handleUseSuggestion = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedToast("Sugestão copiada para a área de transferência!");
      setTimeout(() => setCopiedToast(null), 2500);
    } catch {
      // ignore
    }
    setUsedSuggestions((prev) => ({ ...prev, [id]: true }));
  };

  const handleDismiss = (id: string) => {
    onDismiss?.(id);
  };

  return (
    <div className={`flex h-full w-full min-w-0 flex-col bg-white overflow-hidden select-none ${className}`}>
      {/* 1. Header do Copiloto */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-50 via-teal-100/70 to-indigo-50 border border-teal-200/80 shadow-2xs">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-teal-700" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              COPILOTO
            </h2>
            <p className="text-[11px] text-slate-500 leading-tight">
              Assistência clínica silenciosa
            </p>
          </div>
        </div>

        {/* Badge: Escuta Ativa */}
        <div className="flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200/80 px-3 py-1 text-xs font-semibold text-teal-800 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Escuta ativa</span>
        </div>
      </div>

      {/* Barra Suave de Visualização Sonora */}
      <div className="flex items-center justify-center gap-1 py-2.5 bg-slate-50/50 border-b border-slate-100">
        {[6, 12, 18, 14, 8, 16, 20, 12, 6, 14, 16, 8].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-teal-500/70 animate-pulse"
            style={{
              height: `${h}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: "1.1s",
            }}
          />
        ))}
      </div>

      {/* Feedback Toast */}
      {copiedToast && (
        <div className="mx-6 mt-3 rounded-xl bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-800 font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{copiedToast}</span>
          <span className="text-teal-600 font-bold">✓</span>
        </div>
      )}

      {/* 2. Fluxo Único de Insights Prioritários (SINAL → CONTEXTO CURTO → AÇÃO) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {activeEvents.length === 0 ? (
          /* Estado Normal de Escuta Silenciosa */
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/90 shadow-2xs">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-teal-600" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Escuta ativa</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Acompanhando a conversa em tempo real. Os insights prioritários surgirão aqui em formato direto de sinal e ação.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEvents.map((item) => {
              const time = formatTime(item.createdAt);
              const isUsed = usedSuggestions[item.id];
              const isRecurrence = item.type === "RECORRENCIA";
              const isConnection = item.type === "CONEXAO";
              const isRisk = item.type === "POTENTIAL_RISK" || item.urgency === "high";
              const isSuggestion = item.type === "EXPLORAR" || Boolean(item.suggestedAction);

              if (isRisk) {
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4.5 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                        <span>🔴</span>
                        <span>Ponto de atenção</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">{time}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-rose-950 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenContextSection?.("riscos")}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <span>Ver detalhes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Ignorar</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (isRecurrence) {
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4.5 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                        <span>🟡</span>
                        <span>Tema recorrente detectado</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">{time}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed mt-1">
                        &ldquo;{item.description}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenContextSection?.("temas")}
                        className="inline-flex items-center gap-1 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      >
                        <span>Ver contexto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Ignorar</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (isConnection) {
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-blue-200/90 bg-blue-50/40 p-4.5 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-900">
                        <span>🔵</span>
                        <span>Possível conexão com histórico</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">{time}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed mt-1">
                        &ldquo;{item.description}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenContextSection?.("historico")}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      >
                        <span>Ver histórico</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Ignorar</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Padrão: Sugestão do Copiloto (Roxo/Violeta)
              const actionText = item.suggestedAction || item.description || item.title;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-purple-200/90 bg-purple-50/30 p-4.5 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-900">
                      <span>🟣</span>
                      <span>Sugestão do Copiloto</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{time}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed mt-1 pl-2.5 border-l-2 border-purple-400">
                      &ldquo;{actionText}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUseSuggestion(item.id, actionText)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                        isUsed
                          ? "bg-purple-800 text-white"
                          : "bg-purple-700 hover:bg-purple-800 text-white"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      <span>{isUsed ? "Sugestão usada" : "Usar sugestão"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>Ignorar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
