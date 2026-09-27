"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MeuDiaNextAppointment } from "@/lib/db/dashboard";

interface NextAppointmentCardProps {
  appointment: MeuDiaNextAppointment;
  onStartSession?: (patientId: string) => void;
  className?: string;
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "--:--";
  }
}

/**
 * Normaliza o nome do paciente para capitalização adequada (Title Case)
 * respeitando preposições comuns em português.
 */
function formatPatientName(name: string): string {
  if (!name || typeof name !== "string") return name;
  const prepositions = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && prepositions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

interface ParsedClinicalContext {
  summary: string | null;
  themes: string[];
  evolution: string | null;
  observeToday: string | null;
}

/**
 * Faz parsing defensivo do texto/JSON de memória do paciente sem nunca renderizar
 * JSON bruto ou chaves técnicas ({ ... }).
 */
function parseClinicalMemory(
  rawSummary: string | null,
  fallbackThemes: string[] = []
): ParsedClinicalContext {
  if (!rawSummary || !rawSummary.trim()) {
    return {
      summary: null,
      themes: fallbackThemes.slice(0, 3),
      evolution: null,
      observeToday: null,
    };
  }

  const trimmed = rawSummary.trim();

  // 1. Tentar fazer parse como JSON se parecer estruturado
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;

      // Extrair resumo clínico
      let summary: string | null = null;
      if (typeof parsed.resumo === "string") summary = parsed.resumo;
      else if (typeof parsed.summary === "string") summary = parsed.summary;
      else if (typeof parsed.resumo_clinico === "string") summary = parsed.resumo_clinico;
      else if (typeof parsed.contexto === "string") summary = parsed.contexto;

      // Extrair temas
      const extractedThemes: string[] = [];
      const rawThemes =
        parsed.temas ??
        parsed.themes ??
        parsed.temas_principais ??
        parsed.padroes_recorrentes ??
        parsed["padrões_recorrentes"];

      if (Array.isArray(rawThemes)) {
        for (const item of rawThemes) {
          if (typeof item === "string" && item.trim()) {
            extractedThemes.push(item.trim());
          } else if (item && typeof item === "object") {
            const title = (item as { title?: string; nome?: string; tema?: string }).title ||
              (item as { title?: string; nome?: string; tema?: string }).nome ||
              (item as { title?: string; nome?: string; tema?: string }).tema;
            if (typeof title === "string" && title.trim()) {
              extractedThemes.push(title.trim());
            }
          }
        }
      }

      // Extrair evolução
      let evolution: string | null = null;
      if (typeof parsed.evolucao === "string") evolution = parsed.evolucao;
      else if (typeof parsed.evolucao_geral === "string") evolution = parsed.evolucao_geral;
      else if (typeof parsed["evolução_geral"] === "string") evolution = parsed["evolução_geral"];
      else if (typeof parsed.progresso === "string") evolution = parsed.progresso;

      // Extrair observação para hoje
      let observeToday: string | null = null;
      if (typeof parsed.para_observar === "string") observeToday = parsed.para_observar;
      else if (typeof parsed.para_observar_hoje === "string") observeToday = parsed.para_observar_hoje;
      else if (typeof parsed.observar === "string") observeToday = parsed.observar;
      else if (typeof parsed.proximo_passo === "string") observeToday = parsed.proximo_passo;
      else if (typeof parsed["próximo_passo"] === "string") observeToday = parsed["próximo_passo"];
      else if (typeof parsed.foco === "string") observeToday = parsed.foco;

      const finalThemes = extractedThemes.length > 0 ? extractedThemes : fallbackThemes;

      return {
        summary: summary ? summary.trim() : null,
        themes: finalThemes.slice(0, 3),
        evolution: evolution ? evolution.trim() : null,
        observeToday: observeToday ? observeToday.trim() : null,
      };
    } catch {
      // JSON inválido: trata abaixo como texto livre seguro
    }
  }

  // 2. Se for texto simples (ou JSON que falhou no parse), limpar marcas de formatação excessiva
  let cleanText = trimmed;
  // Se ainda tiver formato JSON residual corrompido, limpa chaves e aspas literais
  if (cleanText.startsWith("{") || cleanText.includes(`":`)) {
    cleanText = cleanText
      .replace(/[{}\[\]"]/g, "")
      .replace(/[a-zA-Z0-9_]+:/g, "")
      .trim();
  }

  // Limitar tamanho para manter compacto
  if (cleanText.length > 280) {
    cleanText = `${cleanText.slice(0, 277).trim()}...`;
  }

  return {
    summary: cleanText || null,
    themes: fallbackThemes.slice(0, 3),
    evolution: null,
    observeToday: null,
  };
}

export function NextAppointmentCard({
  appointment,
  onStartSession,
  className,
}: NextAppointmentCardProps) {
  const {
    sessionId,
    patientId,
    patientName,
    scheduledStart,
    scheduledEnd,
    status,
    durationMinutes,
    notes,
    clinicalBrief,
  } = appointment;

  const startTimeStr = formatTime(scheduledStart);
  const endTimeStr = formatTime(scheduledEnd);
  const formattedName = useMemo(() => formatPatientName(patientName), [patientName]);

  const clinicalContext = useMemo(
    () => parseClinicalMemory(clinicalBrief.patientSummary, clinicalBrief.lastSessionThemes),
    [clinicalBrief.patientSummary, clinicalBrief.lastSessionThemes]
  );

  const statusBadge =
    status === "confirmed" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Confirmado
      </span>
    ) : status === "requested" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Solicitado
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200/80">
        Cancelado
      </span>
    );

  const hasAnyClinicalData =
    Boolean(clinicalContext.summary) ||
    clinicalContext.themes.length > 0 ||
    Boolean(clinicalContext.evolution) ||
    Boolean(clinicalContext.observeToday);

  return (
    <Card
      className={`overflow-hidden border-teal-200/70 bg-gradient-to-br from-white via-teal-50/20 to-white shadow-xs transition-all hover:shadow-sm ${
        className ?? ""
      }`}
    >
      <div className="border-b border-teal-100/80 bg-teal-50/50 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-600" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Próximo Atendimento
            </span>
          </div>

          <div className="flex items-center gap-2">
            {durationMinutes > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {durationMinutes} min
              </span>
            )}
            {statusBadge}
          </div>
        </div>
      </div>

      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3.5 flex-1 min-w-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold tracking-tight text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                  {startTimeStr} — {endTimeStr}
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {formattedName}
              </h2>
            </div>

            {/* Contexto do Acompanhamento */}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Contexto do Acompanhamento
                </span>
              </div>

              {hasAnyClinicalData ? (
                <div className="space-y-2 text-foreground/85 leading-relaxed">
                  {clinicalContext.summary && (
                    <p className="text-xs text-muted-foreground">
                      {clinicalContext.summary}
                    </p>
                  )}

                  {clinicalContext.themes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Temas recorrentes:
                      </span>
                      {clinicalContext.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 border border-teal-100"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}

                  {clinicalContext.evolution && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="font-semibold text-foreground/80">Evolução: </strong>
                      {clinicalContext.evolution}
                    </p>
                  )}

                  {clinicalContext.observeToday && (
                    <p className="text-xs text-teal-900 bg-teal-50/60 rounded p-1.5 border border-teal-100/60">
                      <strong className="font-semibold text-teal-800">Para observar hoje: </strong>
                      {clinicalContext.observeToday}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Sem contexto clínico registrado
                </p>
              )}
            </div>

            {/* Alertas Ativos da Última Sessão */}
            {clinicalBrief.activeRisks.length > 0 ? (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900">
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
                  Sinal clínico registrado na sessão anterior:
                </div>
                {clinicalBrief.activeRisks.map((risk, idx) => (
                  <p key={idx} className="text-amber-800/90 leading-normal">
                    <strong className="capitalize">{risk.type}:</strong> {risk.note}
                  </p>
                ))}
              </div>
            ) : null}

            {/* Anotações do Agendamento */}
            {notes ? (
              <p className="text-xs text-muted-foreground italic">
                <span className="font-semibold not-italic text-foreground/70">
                  Nota do agendamento:
                </span>{" "}
                {notes}
              </p>
            ) : null}
          </div>

          {/* CTA Principal: Fluxo da Sessão */}
          <div className="flex flex-col gap-2 shrink-0 pt-2 lg:pt-0 lg:w-52">
            {sessionId ? (
              <Button
                asChild
                className="h-10 w-full bg-teal-600 text-white font-semibold shadow-xs hover:bg-teal-700 transition-all gap-1.5 text-xs"
              >
                <Link href={`/sessions/${sessionId}`}>
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Abrir Copilot 2.0
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onStartSession?.(patientId)}
                className="h-10 w-full bg-teal-600 text-white font-semibold shadow-xs hover:bg-teal-700 transition-all gap-1.5 text-xs"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Iniciar atendimento
              </Button>
            )}

            <Button
              asChild
              variant="secondary"
              className="h-8 w-full text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Link href={`/patients/${patientId}`}>Ver Prontuário</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
