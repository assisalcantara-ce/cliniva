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
    <Card className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_4px_18px_rgba(34,75,62,0.04)] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#205F52]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-bold text-[#25463E]">
              Atividades Pendentes
            </CardTitle>
          </div>
        </div>

        {pendingSessions.length > 0 && (
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            {pendingSessions.length}
          </span>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {pendingSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2 border border-emerald-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-[#25463E]">
              Nenhuma atividade pendente
            </p>
            <p className="text-[11px] text-[#5C7870] mt-0.5">
              Tudo em dia! Sínteses e memórias consolidadas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingSessions.map((session, idx) => {
              const formattedName = formatPatientName(session.patientName);
              const formattedDate = formatDate(session.sessionDate);
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-[#FCFDFD] hover:bg-[#F7FAF9] transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isEven
                          ? "bg-amber-50 text-[#8C5D23]"
                          : "bg-emerald-50 text-[#205F52]"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#25463E] leading-tight truncate">
                        {isEven ? "Gerar síntese da sessão" : "Revisar registro do atendimento"}
                      </p>
                      <p className="text-[11px] text-[#5C7870] leading-tight truncate mt-0.5">
                        {formattedName} • {formattedDate}
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs font-bold text-[#205F52] border border-emerald-200/80 hover:bg-[#EAF5ED] shrink-0 rounded-lg"
                  >
                    <Link href={`/sessions/${session.sessionId}`}>
                      {isEven ? "Concluir →" : "Revisar →"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
