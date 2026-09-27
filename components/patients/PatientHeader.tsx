import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ClinicalPatientInfo } from "@/lib/db/patientSummary";

interface PatientHeaderProps {
  patient: ClinicalPatientInfo;
  onStartSession?: () => void;
  onEditPatient?: () => void;
  isStartingSession?: boolean;
  className?: string;
}

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

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "—";
  }
}

export function PatientHeader({
  patient,
  onStartSession,
  onEditPatient,
  isStartingSession = false,
  className,
}: PatientHeaderProps) {
  const formattedName = useMemo(() => formatPatientName(patient.fullName), [patient.fullName]);
  const formattedCreatedAt = useMemo(() => formatDate(patient.createdAt), [patient.createdAt]);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {/* Top back navigation */}
      <div>
        <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/patients">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para Pacientes
          </Link>
        </Button>
      </div>

      {/* Main header block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formattedName}
            </h1>

            {/* Status Badge */}
            {patient.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Inativo
              </span>
            )}

            {patient.patientNumber != null && (
              <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                Nº {patient.patientNumber}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Cadastrado em {formattedCreatedAt}</span>
            <span className="text-border-strong">•</span>
            <span className="font-mono text-[11px] opacity-75">ID: {patient.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onEditPatient && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onEditPatient}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editar paciente
            </Button>
          )}

          {onStartSession && (
            <Button
              type="button"
              onClick={onStartSession}
              disabled={isStartingSession}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs gap-1.5 px-3.5 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="5 3 19 12 5 21 5 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{isStartingSession ? "Iniciando..." : "Iniciar atendimento com Copilot 2.0"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
