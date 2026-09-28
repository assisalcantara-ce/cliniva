"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface PreSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  isResuming?: boolean;
  onStartSession: () => void;
}

interface PreSessionMemoryData {
  temasRecorrentes?: string[];
  padroesObservados?: string[];
  evolucao?: string;
  estrategias?: string[];
  proximoPasso?: string;
  fallbackText?: string;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastSessionDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "Primeiro atendimento registrado";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formattedDate = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    if (hours !== "00" || minutes !== "00") {
      return `Último atendimento: ${formattedDate} às ${hours}:${minutes}`;
    }
    return `Último atendimento: ${formattedDate}`;
  } catch {
    return dateStr;
  }
}

function parsePreSessionMemory(raw?: string | null): PreSessionMemoryData | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Tenta parsear como JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      const toList = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (typeof item === "object" && item !== null) {
                const text =
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown }).title ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown }).tema ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown }).nome ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown }).description ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown }).step;
                if (typeof text === "string" && text.trim()) return text.trim();
              }
              return null;
            })
            .filter((x): x is string => Boolean(x));
        }
        if (typeof val === "string") {
          return val
            .split(/[\n;•]+/)
            .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
            .filter((s) => s.length > 0 && !s.startsWith("{") && !s.endsWith("}"));
        }
        return [];
      };

      const toStringVal = (val: unknown): string | undefined => {
        if (!val) return undefined;
        if (typeof val === "string") {
          const t = val.trim();
          return t.length > 0 && !t.startsWith("{") && !t.endsWith("}") ? t : undefined;
        }
        if (Array.isArray(val)) {
          const list = toList(val);
          return list.length > 0 ? list.join(" • ") : undefined;
        }
        return undefined;
      };

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const temas = toList(
          parsed.temas_principais || parsed.temas || parsed.themes || parsed.recurringThemes
        );
        const padroes = toList(
          parsed.padroes_recorrentes ||
            parsed.padroes ||
            parsed.patterns ||
            parsed.key_patterns ||
            parsed["padrões_recorrentes"]
        );
        const evolucao = toStringVal(
          parsed.evolucao_geral ||
            parsed.evolucao_clinica ||
            parsed.evolucao ||
            parsed.summary ||
            parsed.progress ||
            parsed.resumo
        );
        const estrategias = toList(
          parsed.estrategias_de_lidar_com_estresse ||
            parsed.estrategias_efetivas ||
            parsed.estrategias ||
            parsed.strategies
        );
        const proximoPasso = toStringVal(
          parsed.proximo_passo ||
            parsed.next_step ||
            parsed.next_steps ||
            parsed.proximos_passos
        );

        const hasAny =
          temas.length > 0 ||
          padroes.length > 0 ||
          Boolean(evolucao) ||
          estrategias.length > 0 ||
          Boolean(proximoPasso);

        if (hasAny) {
          return {
            temasRecorrentes: temas.length > 0 ? temas : undefined,
            padroesObservados: padroes.length > 0 ? padroes : undefined,
            evolucao,
            estrategias: estrategias.length > 0 ? estrategias : undefined,
            proximoPasso,
          };
        }
      }
    } catch {
      // Ignora erro de JSON e usa fallback
    }
  }

  // Fallback de texto livre sem JSON
  const clean = trimmed.replace(/[{}[\]"]/g, "").trim();
  if (clean.length > 0) {
    return { fallbackText: clean };
  }

  return null;
}

export function PreSessionView({
  patientName,
  patientMemory,
  lastSessionDate,
  isResuming = false,
  onStartSession,
}: PreSessionViewProps) {
  const [showFullMemory, setShowFullMemory] = useState(false);

  const displayName = patientName || "Paciente";
  const initials = getInitials(patientName);
  const formattedLastDate = formatLastSessionDate(lastSessionDate);
  const memory = parsePreSessionMemory(patientMemory);

  const hasStructuredMemory =
    memory &&
    (memory.temasRecorrentes?.length ||
      memory.padroesObservados?.length ||
      memory.evolucao ||
      memory.estrategias?.length ||
      memory.proximoPasso ||
      memory.fallbackText);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-100/80 py-8 sm:py-12 px-4 sm:px-6 flex flex-col justify-start">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* CARD 1 — Preparação de Atendimento */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 text-sm font-bold border border-teal-200 shadow-2xs">
                {initials}
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
                  {isResuming ? "Atendimento em Andamento" : "Preparação de Atendimento"}
                </span>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                  {displayName}
                </h1>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <span>📅</span>
                    <span>{formattedLastDate}</span>
                  </span>
                  <span>•</span>
                  <span>Atendimento individual</span>
                </div>
              </div>
            </div>

            <Button
              onClick={onStartSession}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs font-semibold text-sm px-6 h-11 rounded-xl cursor-pointer shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {isResuming ? "Retomar Atendimento" : "Iniciar Atendimento"}
            </Button>
          </div>
        </div>

        {/* CARD 2 — Contexto Clínico & Memória do Paciente */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/80 shadow-2xs">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Contexto Clínico & Histórico
              </h2>
            </div>

            {hasStructuredMemory && (
              <button
                type="button"
                onClick={() => setShowFullMemory(!showFullMemory)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
              >
                {showFullMemory ? "Recolher resumo" : "Ver contexto completo"}
              </button>
            )}
          </div>

          {hasStructuredMemory ? (
            <div className="space-y-4 pt-1">
              {/* Temas Recorrentes */}
              {memory?.temasRecorrentes && memory.temasRecorrentes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Temas recorrentes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.temasRecorrentes.map((tema, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-200/80 bg-teal-50/60 px-2.5 py-1 text-xs font-medium text-teal-900 shadow-2xs"
                      >
                        <span className="text-teal-600">📄</span>
                        {tema}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Padrões Observados */}
              {memory?.padroesObservados && memory.padroesObservados.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Padrões observados
                  </span>
                  <div className="rounded-xl border border-violet-200/70 bg-violet-50/40 p-3.5 space-y-1">
                    {memory.padroesObservados.map((padrao, i) => (
                      <p key={i} className="text-xs text-violet-950/90 leading-relaxed">
                        • {padrao}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Evolução */}
              {memory?.evolucao && (
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Evolução
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    {memory.evolucao}
                  </p>
                </div>
              )}

              {/* Conteúdo expandido sob demanda */}
              {showFullMemory && (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in">
                  {/* Estratégias Relevantes */}
                  {memory?.estrategias && memory.estrategias.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Estratégias relevantes
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        {memory.estrategias.map((est, i) => (
                          <li key={i} className="leading-relaxed">
                            {est}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Próximo Passo */}
                  {memory?.proximoPasso && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Próximo passo planejado
                      </span>
                      <p className="text-xs text-blue-900 bg-blue-50/50 p-3 rounded-xl border border-blue-200/70 leading-relaxed">
                        🎯 {memory.proximoPasso}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback de texto puro formatado se não tiver chaves estruturadas */}
              {memory?.fallbackText && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 whitespace-pre-line">
                  {memory.fallbackText}
                </p>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Nenhum histórico anterior registrado para este paciente. À medida que as sessões forem finalizadas, os tópicos e sínteses aparecerão organizados aqui.
              </p>
            </div>
          )}
        </div>

        {/* CARD 3 — Copilot em Tempo Real */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shadow-2xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-slate-900">
                Apoio Clínico do Copilot em Tempo Real
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Durante o atendimento, o Copilot acompanha a conversa silenciosamente para destacar temas e conexões com o histórico do paciente. Nenhuma sugestão interfere no atendimento ou substitui o julgamento profissional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
