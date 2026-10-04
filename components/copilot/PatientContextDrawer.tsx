"use client";

import React, { useEffect } from "react";

export interface PatientContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
}

interface ParsedMemory {
  temasRecorrentes: string[];
  padroesObservados: string[];
  evolucao: string;
  estrategias: string[];
  proximoPasso: string;
  resumoGeral: string[];
}

function parseMemory(raw?: string | null): ParsedMemory {
  const result: ParsedMemory = {
    temasRecorrentes: [],
    padroesObservados: [],
    evolucao: "",
    estrategias: [],
    proximoPasso: "",
    resumoGeral: [],
  };

  if (!raw || !raw.trim()) return result;
  const trimmed = raw.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      const extractStrings = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (typeof item === "object" && item !== null) {
                const rec = item as Record<string, unknown>;
                const text = rec.title || rec.tema || rec.nome || rec.description || rec.step || rec.note;
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

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        result.temasRecorrentes = extractStrings(
          parsed.temas_principais || parsed.temas || parsed.themes || parsed.recurringThemes
        );
        result.padroesObservados = extractStrings(
          parsed.padroes_recorrentes || parsed.padroes || parsed.patterns || parsed.key_patterns
        );
        const evol = parsed.evolucao_clinica || parsed.evolucao || parsed.summary || parsed.progress;
        if (typeof evol === "string") {
          result.evolucao = evol.trim();
        } else if (Array.isArray(evol)) {
          result.evolucao = extractStrings(evol).join(". ");
        }

        result.estrategias = extractStrings(
          parsed.estrategias_de_lidar_com_estresse ||
            parsed.estrategias_efetivas ||
            parsed.estrategias ||
            parsed.strategies
        );

        const prox = parsed.proximo_passo || parsed.next_step || parsed.next_steps;
        if (typeof prox === "string") {
          result.proximoPasso = prox.trim();
        } else if (Array.isArray(prox)) {
          result.proximoPasso = extractStrings(prox).join("; ");
        }
      }
      return result;
    } catch {
      // Ignora erro e cai no fallback
    }
  }

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter((l) => l.length > 0 && !l.startsWith("{") && !l.endsWith("}"));

  result.resumoGeral = lines;
  return result;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PZ";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const PatientContextDrawer: React.FC<PatientContextDrawerProps> = ({
  isOpen,
  onClose,
  patientName,
  patientMemory,
  lastSessionDate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const memory = parseMemory(patientMemory);
  const initials = getInitials(patientName);
  const displayName = patientName || "Paciente";

  const hasStructuredData =
    memory.temasRecorrentes.length > 0 ||
    memory.padroesObservados.length > 0 ||
    Boolean(memory.evolucao) ||
    memory.estrategias.length > 0 ||
    Boolean(memory.proximoPasso) ||
    memory.resumoGeral.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop com blur suave */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className="relative z-50 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Contexto clínico do paciente"
      >
        {/* Header do Drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-sm ring-2 ring-teal-200/50 shadow-2xs">
              {initials}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {displayName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lastSessionDate ? `Última sessão: ${lastSessionDate}` : "Histórico clínico longitudinal"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar painel de contexto"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo do Drawer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {!hasStructuredData ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-slate-800">Nenhuma memória anterior</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                As anotações e sínteses consolidadas desta sessão serão adicionadas automaticamente à memória do paciente.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Temas Recorrentes */}
              {memory.temasRecorrentes.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-xs">
                      🎯
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Temas Recorrentes
                    </h3>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {memory.temasRecorrentes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 2. Padrões Observados */}
              {memory.padroesObservados.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs">
                      🔄
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Padrões Observados
                    </h3>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {memory.padroesObservados.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Evolução Geral */}
              {memory.evolucao && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 text-xs">
                      📈
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Evolução Clínica
                    </h3>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed pl-2">
                    {memory.evolucao}
                  </p>
                </div>
              )}

              {/* 4. Estratégias Relevantes */}
              {memory.estrategias.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs">
                      💡
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Estratégias Relevantes
                    </h3>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {memory.estrategias.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5. Próximo Passo */}
              {memory.proximoPasso && (
                <div className="rounded-2xl border border-teal-200/80 bg-teal-50/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-700 text-xs">
                      🧭
                    </span>
                    <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                      Próximo Passo Planejado
                    </h3>
                  </div>
                  <p className="text-xs text-teal-800 leading-relaxed pl-2 font-medium">
                    {memory.proximoPasso}
                  </p>
                </div>
              )}

              {/* 6. Resumo Geral de Linhas */}
              {memory.resumoGeral.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-700 text-xs">
                      📋
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Síntese Longitudinal
                    </h3>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {memory.resumoGeral.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer do Drawer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200/80 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
          >
            Fechar Contexto
          </button>
        </div>
      </aside>
    </div>
  );
};
