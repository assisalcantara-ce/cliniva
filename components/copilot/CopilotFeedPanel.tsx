"use client";

import React, { useState } from "react";
import { CopilotEventCard } from "./CopilotEventCard";
import type { CopilotEventItem } from "./useCopilotStream";

export interface CopilotFeedPanelProps {
  events: CopilotEventItem[];
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  onDismiss?: (id: string) => void;
  onPin?: (id: string) => void;
  className?: string;
}

type TabType = "contexto" | "observacoes" | "intervencoes" | "perguntas" | "passos";

interface ClinicalMemorySection {
  title: string;
  items: string[];
}

/**
 * Normaliza e formata a memória longitudinal clínica para exibição humana na UI.
 * Nunca renderiza JSON bruto nem objetos não tratados.
 */
function parseClinicalMemory(raw?: string | null): ClinicalMemorySection[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();

  // Se for uma string JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      const toCleanItems = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (typeof item === "object" && item !== null) {
                const text =
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).title ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).tema ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).nome ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).description ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).hypothesis ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).step ||
                  (item as { title?: unknown; nome?: unknown; tema?: unknown; step?: unknown; description?: unknown; note?: unknown; hypothesis?: unknown }).note;
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

      const sections: ClinicalMemorySection[] = [];

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        // 1. Temas recorrentes
        const temas = parsed.temas_principais || parsed.temas || parsed.themes || parsed.recurringThemes;
        const temasItems = toCleanItems(temas);
        if (temasItems.length > 0) {
          sections.push({ title: "Temas recorrentes", items: temasItems });
        }

        // 2. Padrões observados
        const padroes = parsed.padroes_recorrentes || parsed.padroes || parsed.patterns || parsed.key_patterns || parsed["padrões_recorrentes"];
        const padroesItems = toCleanItems(padroes);
        if (padroesItems.length > 0) {
          sections.push({ title: "Padrões observados", items: padroesItems });
        }

        // 3. Evolução / Resumo
        const evolucao = parsed.evolucao_clinica || parsed.evolucao || parsed.summary || parsed.progress || parsed.resumo;
        const evolucaoItems = toCleanItems(evolucao);
        if (evolucaoItems.length > 0) {
          sections.push({ title: "Evolução clínica", items: evolucaoItems });
        }

        // 4. Estratégias / Recomendações
        const estrategias = parsed.estrategias_efetivas || parsed.estrategias || parsed.strategies || parsed.next_steps || parsed.proximos_passos;
        const estrategiasItems = toCleanItems(estrategias);
        if (estrategiasItems.length > 0) {
          sections.push({ title: "Estratégias relevantes", items: estrategiasItems });
        }

        // Fallback para outras chaves não nulas
        if (sections.length === 0) {
          for (const [k, v] of Object.entries(parsed)) {
            const items = toCleanItems(v);
            if (items.length > 0) {
              const formattedTitle = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              sections.push({ title: formattedTitle, items });
            }
          }
        }
      } else if (Array.isArray(parsed)) {
        const items = toCleanItems(parsed);
        if (items.length > 0) {
          sections.push({ title: "Histórico Clínico", items });
        }
      }

      if (sections.length > 0) {
        return sections;
      }
    } catch {
      // Ignora erro de parse e cai no fallback de texto puro
    }
  }

  // Fallback para texto livre
  const cleanLines = trimmed
    .split(/\n+/)
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter((l) => l.length > 0 && !l.startsWith("{") && !l.endsWith("}"));

  if (cleanLines.length > 0) {
    return [{ title: "Síntese Longitudinal", items: cleanLines }];
  }

  return [];
}

export const CopilotFeedPanel: React.FC<CopilotFeedPanelProps> = ({
  events,
  patientName,
  patientMemory,
  lastSessionDate,
  onDismiss,
  onPin,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("contexto");
  const [patientContextOpen, setPatientContextOpen] = useState(true);
  const [themesOpen, setThemesOpen] = useState(true);
  const [risksOpen, setRisksOpen] = useState(true);
  const [showFullMemory, setShowFullMemory] = useState(false);
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [sessionObjective, setSessionObjective] = useState("");

  // Categorização dinâmica dos eventos por tipo
  const riskEvents = events.filter((e) => e.type === "POTENTIAL_RISK");
  const connectionEvents = events.filter((e) => e.type === "CONEXAO" || e.type === "RECORRENCIA");
  const explorationEvents = events.filter((e) => e.type === "EXPLORAR");
  const noteEvents = events.filter((e) => e.type === "NOTA" || e.type === "ACOMPANHAR");

  // Filtragem dos eventos de acordo com a aba selecionada
  const filteredEvents = () => {
    switch (activeTab) {
      case "observacoes":
        return noteEvents;
      case "intervencoes":
        return explorationEvents;
      case "perguntas":
        return events.filter((e) => e.type === "EXPLORAR" || e.type === "ACOMPANHAR");
      case "passos":
        return events.filter((e) => e.type === "ACOMPANHAR" || e.type === "NOTA");
      case "contexto":
      default:
        return events;
    }
  };

  const visibleEvents = filteredEvents();
  const displayName = patientName || "Paciente em Atendimento";
  const parsedMemory = parseClinicalMemory(patientMemory);

  return (
    <div className={`flex h-full w-full min-w-0 flex-col bg-white overflow-hidden ${className}`}>
      {/* 1. Header do Card Copilot (Fixo) */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🧠</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
            Copilot Assistivo
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {events.length > 0 ? `${events.length} em foco` : "Escuta ativa"}
          </span>
        </div>
      </div>

      {/* 2. Segmented Control de Abas Perfeito (Sem Overflow, Sem Barra de Rolagem) */}
      <div className="px-3.5 py-2 border-b border-slate-100 bg-white shrink-0">
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/80 rounded-xl">
          {/* Tab 1: Contexto */}
          <button
            type="button"
            onClick={() => setActiveTab("contexto")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "contexto"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
            title="Contexto"
          >
            <svg className="h-3.5 w-3.5 text-teal-600 shrink-0 hidden sm:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="truncate">Contexto</span>
          </button>

          {/* Tab 2: Observações */}
          <button
            type="button"
            onClick={() => setActiveTab("observacoes")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "observacoes"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
            title="Observações"
          >
            <svg className="h-3.5 w-3.5 text-slate-500 shrink-0 hidden sm:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            <span className="truncate">Obs</span>
            {noteEvents.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-700">
                {noteEvents.length}
              </span>
            )}
          </button>

          {/* Tab 3: Intervenções */}
          <button
            type="button"
            onClick={() => setActiveTab("intervencoes")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "intervencoes"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
            title="Intervenções"
          >
            <svg className="h-3.5 w-3.5 text-violet-500 shrink-0 hidden sm:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span className="truncate">Intervir</span>
            {explorationEvents.length > 0 && (
              <span className="rounded-full bg-violet-100 px-1 text-[9px] font-bold text-violet-700">
                {explorationEvents.length}
              </span>
            )}
          </button>

          {/* Tab 4: Perguntas */}
          <button
            type="button"
            onClick={() => setActiveTab("perguntas")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "perguntas"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
            title="Perguntas"
          >
            <span className="font-bold text-teal-700 text-xs hidden sm:inline">?</span>
            <span className="truncate">Perguntas</span>
          </button>

          {/* Tab 5: Próximos Passos */}
          <button
            type="button"
            onClick={() => setActiveTab("passos")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "passos"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
            title="Próximos Passos"
          >
            <svg className="h-3.5 w-3.5 text-blue-500 shrink-0 hidden sm:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="truncate">Passos</span>
          </button>
        </div>
      </div>

      {/* 3. Corpo Principal com Cards Flutuantes (Sem barra de rolagem visual) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/40 scrollbar-none">
        {/* CARD FLUTUANTE 1: Hero Copilot Ativo */}
        <div className="rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/70 via-teal-50/20 to-white p-4 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100/80 text-teal-700 border border-teal-200/90 shadow-2xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Copilot em escuta ativa</h3>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Acompanhando o diálogo da sessão para sugerir conexões e observações clínicas relevantes.
              </p>
            </div>
          </div>

          {/* 4 Feature Tags Flutuantes */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs">
              <span className="text-teal-600">📄</span>
              <span className="truncate">Identifica temas</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs">
              <span className="text-violet-600">🔗</span>
              <span className="truncate">Conecta histórico</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs">
              <span className="text-amber-600">💡</span>
              <span className="truncate">Intervenções</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs">
              <span className="text-rose-600">⚠️</span>
              <span className="truncate">Sinais de alerta</span>
            </div>
          </div>
        </div>

        {/* CARD FLUTUANTE 2: Contexto do Paciente */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
          <button
            type="button"
            onClick={() => setPatientContextOpen(!patientContextOpen)}
            className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span>Contexto do Paciente</span>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${patientContextOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {patientContextOpen && (
            <div className="pt-2 space-y-3 border-t border-slate-100">
              {/* Grid de Informações Estruturadas (2 colunas desktop, 1 coluna mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">👤</span>
                  <span className="font-semibold text-slate-800 truncate">{displayName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>📅</span>
                  <span className="truncate">
                    {lastSessionDate ? `Última: ${new Date(lastSessionDate).toLocaleDateString("pt-BR")}` : "Primeira sessão"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>🎂</span>
                  <span>Idade não informada</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>🛡️</span>
                  <span>Sem diagnósticos</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>👥</span>
                  <span>Individual</span>
                </div>
                <div className="flex items-center gap-2 text-teal-800 font-medium">
                  <span>📋</span>
                  <span>Anamnese ok</span>
                </div>
              </div>

              {/* Memória Clínica Resumida & Elegante (Nunca JSON bruto) */}
              {parsedMemory.length > 0 && (
                <div className="rounded-xl border border-violet-200/70 bg-violet-50/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-900">
                      <span>🧠</span>
                      <span>Memória Clínica</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFullMemory(!showFullMemory)}
                      className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 transition-colors cursor-pointer"
                    >
                      {showFullMemory ? "Recolher" : "Ver contexto completo"}
                    </button>
                  </div>

                  {/* Visualização Resumida */}
                  {!showFullMemory ? (
                    <div className="space-y-1.5 text-xs text-violet-950">
                      {parsedMemory[0]?.items && (
                        <div>
                          <span className="font-bold text-[11px] text-violet-900">
                            {parsedMemory[0].title}:
                          </span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5 line-clamp-2">
                            {parsedMemory[0].items.slice(0, 3).join(" • ")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Visualização Completa */
                    <div className="space-y-2 pt-1 border-t border-violet-200/50">
                      {parsedMemory.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                          <span className="text-[11px] font-bold text-violet-950">
                            {section.title}
                          </span>
                          <ul className="space-y-0.5 text-xs text-violet-900/90 pl-3">
                            {section.items.map((item, iIdx) => (
                              <li key={iIdx} className="list-disc leading-relaxed">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD FLUTUANTE 3: Objetivo desta Sessão */}
        <div className="rounded-xl border border-blue-200/70 bg-blue-50/25 p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold">🎯</span>
              <span className="text-xs font-bold text-blue-950">Objetivo desta Sessão</span>
            </div>
            <button
              type="button"
              onClick={() => setObjectiveModalOpen(!objectiveModalOpen)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100/80 text-blue-800 hover:bg-blue-200 transition-colors text-xs font-bold cursor-pointer"
              title="Definir objetivo"
            >
              +
            </button>
          </div>

          <p className="text-xs text-blue-900/85 leading-relaxed">
            {sessionObjective || "Defina o objetivo da sessão ou acompanhe as sugestões identificadas pelo Copilot conforme a conversa avança."}
          </p>

          {objectiveModalOpen && (
            <div className="pt-2 border-t border-blue-200/60 space-y-2 animate-in fade-in">
              <input
                type="text"
                value={sessionObjective}
                onChange={(e) => setSessionObjective(e.target.value)}
                placeholder="Ex: Trabalhar regulação emocional e crenças limitantes..."
                className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setObjectiveModalOpen(false)}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Salvar Objetivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CARD FLUTUANTE 4: Temas em Discussão */}
        <div className="rounded-xl border border-rose-200/70 bg-rose-50/25 p-4 shadow-2xs space-y-2.5">
          <button
            type="button"
            onClick={() => setThemesOpen(!themesOpen)}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-rose-600">📄</span>
              <span className="text-xs font-bold text-rose-950">Temas em Discussão</span>
            </div>
            <svg
              className={`h-4 w-4 text-rose-700/60 transition-transform duration-200 ${themesOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {themesOpen && (
            <div className="pt-0.5">
              {connectionEvents.length > 0 ? (
                <div className="space-y-2">
                  {connectionEvents.map((evt) => (
                    <div key={evt.id} className="rounded-lg bg-white p-2.5 text-xs border border-rose-100 shadow-2xs space-y-0.5">
                      <p className="font-semibold text-rose-950">{evt.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{evt.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-rose-900/75 leading-relaxed">
                  Os temas e padrões identificados durante a conversa aparecerão aqui em tempo real.
                </p>
              )}
            </div>
          )}
        </div>

        {/* CARD FLUTUANTE 5: Pontos de Atenção */}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/25 p-4 shadow-2xs space-y-2.5">
          <button
            type="button"
            onClick={() => setRisksOpen(!risksOpen)}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-600">⚠️</span>
              <span className="text-xs font-bold text-amber-950">Pontos de Atenção</span>
            </div>
            <svg
              className={`h-4 w-4 text-amber-700/60 transition-transform duration-200 ${risksOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {risksOpen && (
            <div className="pt-0.5">
              {riskEvents.length > 0 ? (
                <div className="space-y-2">
                  {riskEvents.map((evt) => (
                    <div key={evt.id} className="rounded-lg bg-white p-2.5 text-xs border border-amber-200 shadow-2xs space-y-0.5">
                      <p className="font-semibold text-amber-950">{evt.title}</p>
                      <p className="text-[11px] text-amber-900/85 leading-relaxed">{evt.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-900/75 leading-relaxed">
                  Sinais importantes e alertas observados pelo Copilot serão exibidos aqui.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Feed de Eventos Filtrados/Ativos */}
        {visibleEvents.length > 0 && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sugestões Ativas ({visibleEvents.length})
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3">
              {visibleEvents.map((event) => (
                <CopilotEventCard
                  key={event.id}
                  event={event}
                  onDismiss={onDismiss}
                  onPin={onPin}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer com Disclaimer Ético (Fixo) */}
      <div className="border-t border-slate-100 px-4 py-2.5 bg-white text-center shrink-0">
        <p className="text-[10px] text-slate-500 font-medium">
          Sugestões contextuais não diagnósticas · O julgamento clínico é sempre do profissional.
        </p>
      </div>
    </div>
  );
};
