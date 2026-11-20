import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MeuDiaPendingPostSession } from "@/lib/db/dashboard";

interface PendingActivitiesProps {
  pendingSessions: MeuDiaPendingPostSession[];
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "—";
  }
}

function formatPatientName(name: string): string {
  if (!name) return "Paciente";
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

export function PendingActivities({ pendingSessions }: PendingActivitiesProps) {
  return (
    <Card className="rounded-xl border border-border/70 bg-white shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Atividades Pendentes
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Sessões que necessitam de consolidação clínica pós-atendimento
            </p>
          </div>
        </div>

        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
          {pendingSessions.length} {pendingSessions.length === 1 ? "pendência" : "pendências"}
        </span>
      </CardHeader>

      <CardContent className="p-0">
        {pendingSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2 border border-emerald-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-foreground">
              Nenhuma atividade pendente
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Todas as sessões gravadas possuem síntese gerada e memória consolidada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {pendingSessions.map((session) => {
              const formattedName = formatPatientName(session.patientName);
              const formattedDate = formatDate(session.sessionDate);

              return (
                <div
                  key={session.sessionId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-amber-50/20 transition-colors gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {formattedName}
                      </p>
                      <span className="rounded bg-amber-100/70 border border-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                        {session.chunksCount} trechos gravados
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sessão realizada em {formattedDate} · Síntese pendente
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      asChild
                      size="sm"
                      className="h-7 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs"
                    >
                      <Link href={`/sessions/${session.sessionId}`}>
                        Gerar Síntese
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/patients/${session.patientId}`}>
                        Prontuário
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
