import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClinicalSummaryContext } from "@/lib/db/patientSummary";

interface ClinicalContextCardProps {
  context: ClinicalSummaryContext;
  className?: string;
}

interface ParsedClinicalMemory {
  summary: string | null;
  observeToday: string | null;
  evolution: string | null;
  themes: string[];
}

/**
 * Faz parsing defensivo da memória para nunca renderizar JSON bruto
 */
function parseMemorySummary(raw: string | null): ParsedClinicalMemory {
  if (!raw || !raw.trim()) {
    return { summary: null, observeToday: null, evolution: null, themes: [] };
  }

  const trimmed = raw.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;

      let summary: string | null = null;
      if (typeof parsed.resumo === "string") summary = parsed.resumo;
      else if (typeof parsed.summary === "string") summary = parsed.summary;
      else if (typeof parsed.resumo_clinico === "string") summary = parsed.resumo_clinico;
      else if (typeof parsed.contexto === "string") summary = parsed.contexto;

      let observeToday: string | null = null;
      if (typeof parsed.para_observar === "string") observeToday = parsed.para_observar;
      else if (typeof parsed.para_observar_hoje === "string") observeToday = parsed.para_observar_hoje;
      else if (typeof parsed.observar === "string") observeToday = parsed.observar;
      else if (typeof parsed.foco === "string") observeToday = parsed.foco;

      let evolution: string | null = null;
      if (typeof parsed.evolucao === "string") evolution = parsed.evolucao;
      else if (typeof parsed.evolucao_geral === "string") evolution = parsed.evolucao_geral;
      else if (typeof parsed["evolução_geral"] === "string") evolution = parsed["evolução_geral"];

      const extractedThemes: string[] = [];
      const rawThemes =
        parsed.temas_principais ??
        parsed.padroes_recorrentes ??
        parsed.temas ??
        parsed.themes ??
        parsed.recurringThemes ??
        parsed["padrões_recorrentes"];

      if (Array.isArray(rawThemes)) {
        for (const item of rawThemes) {
          if (typeof item === "string" && item.trim()) {
            extractedThemes.push(item.trim());
          } else if (typeof item === "object" && item !== null) {
            const title =
              (item as { title?: unknown; nome?: unknown; tema?: unknown }).title ||
              (item as { title?: unknown; nome?: unknown; tema?: unknown }).nome ||
              (item as { title?: unknown; nome?: unknown; tema?: unknown }).tema;
            if (typeof title === "string" && title.trim()) {
              extractedThemes.push(title.trim());
            }
          }
        }
      } else if (typeof rawThemes === "string" && rawThemes.trim()) {
        const split = rawThemes.split(/[,\n•;]+/).map((t) => t.trim()).filter(Boolean);
        extractedThemes.push(...split);
      }

      return {
        summary: summary ? summary.trim() : null,
        observeToday: observeToday ? observeToday.trim() : null,
        evolution: evolution ? evolution.trim() : null,
        themes: extractedThemes,
      };
    } catch {
      // continua para fallback de texto simples
    }
  }

  let cleanText = trimmed;
  if (cleanText.startsWith("{") || cleanText.includes(`":`)) {
    cleanText = cleanText
      .replace(/[{}\[\]"]/g, "")
      .replace(/[a-zA-Z0-9_]+:/g, "")
      .trim();
  }

  return {
    summary: cleanText || null,
    observeToday: null,
    evolution: null,
    themes: [],
  };
}

export function ClinicalContextCard({ context, className }: ClinicalContextCardProps) {
  const { memorySummary, recurringThemes, activeRisks } = context;

  const parsedMemory = useMemo(
    () => parseMemorySummary(memorySummary),
    [memorySummary]
  );

  const finalThemes = useMemo(() => {
    if (recurringThemes && recurringThemes.length > 0) {
      return recurringThemes;
    }
    return parsedMemory.themes.slice(0, 5);
  }, [recurringThemes, parsedMemory.themes]);

  const hasData =
    Boolean(parsedMemory.summary) ||
    finalThemes.length > 0 ||
    activeRisks.length > 0 ||
    Boolean(parsedMemory.observeToday) ||
    Boolean(parsedMemory.evolution);

  return (
    <Card
      className={`border-teal-200/70 bg-gradient-to-br from-white via-teal-50/15 to-white shadow-xs ${
        className ?? ""
      }`}
    >
      <CardHeader className="border-b border-teal-100/80 bg-teal-50/40 px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-600" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Contexto do Acompanhamento
            </CardTitle>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            Memória Longitudinal do Paciente
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        {hasData ? (
          <div className="space-y-3.5">
            {/* Resumo da Memória Clínica */}
            {parsedMemory.summary ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {parsedMemory.summary}
              </p>
            ) : null}

            {/* Temas Recorrentes */}
            {finalThemes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Padrões e temas recorrentes:
                </span>
                {finalThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 border border-teal-100"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {/* Evolução */}
            {parsedMemory.evolution && (
              <p className="text-xs text-muted-foreground">
                <strong className="font-semibold text-foreground/80">Evolução percebida: </strong>
                {parsedMemory.evolution}
              </p>
            )}

            {/* Para Observar Hoje */}
            {parsedMemory.observeToday && (
              <div className="rounded-md border border-teal-100 bg-teal-50/50 p-2 text-xs text-teal-900">
                <strong className="font-semibold text-teal-800">Para observar: </strong>
                {parsedMemory.observeToday}
              </div>
            )}

            {/* Sinais Clínicos e Riscos Ativos da Última Sessão */}
            {activeRisks.length > 0 && (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Sinais de atenção recentes:</span>
                </div>
                {activeRisks.map((risk, idx) => (
                  <p key={idx} className="text-amber-800/90 leading-normal pl-5">
                    <strong className="capitalize">{risk.type}:</strong> {risk.note}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Sem contexto clínico registrado ainda. As informações serão sintetizadas automaticamente conforme os atendimentos forem realizados.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
