"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeuDiaNextAppointment } from "@/lib/db/dashboard";

interface ClinicalDayAlertsProps {
  nextAppointment: MeuDiaNextAppointment | null;
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

export function ClinicalDayAlerts({
  nextAppointment,
  className,
}: ClinicalDayAlertsProps) {
  const activeRisks = nextAppointment?.clinicalBrief?.activeRisks ?? [];
  const patientName = nextAppointment?.patientName
    ? formatPatientName(nextAppointment.patientName)
    : "Próximo paciente";

  if (activeRisks.length === 0) {
    return (
      <Card className={`border-border/60 bg-card/60 ${className ?? ""}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80 block">
              Acompanhamento
            </span>
            Nenhum sinal de risco aberto registrado para este atendimento.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-amber-200 bg-amber-50/40 ${className ?? ""}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <svg
              className="h-3.5 w-3.5"
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
          </div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Sinais para Atenção Pré-Sessão ({patientName})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-2">
        {activeRisks.map((risk, index) => (
          <div
            key={index}
            className="rounded-md border border-amber-200/70 bg-white/80 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-amber-900">{risk.type}</span>
              {risk.urgency === "alta" ? (
                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                  Urgência Alta
                </span>
              ) : (
                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-medium text-amber-800">
                  Urgência Média
                </span>
              )}
            </div>
            {risk.note ? (
              <p className="mt-1 text-muted-foreground leading-relaxed">
                {risk.note}
              </p>
            ) : null}
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground/80 italic pt-1">
          * Dados recuperados da análise assistiva da sessão anterior para apoio ao enquadre.
        </p>
      </CardContent>
    </Card>
  );
}
