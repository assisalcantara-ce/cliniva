import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClinicalTimelineItem } from "@/lib/db/patientSummary";

interface PatientTimelineProps {
  timeline: ClinicalTimelineItem[];
  className?: string;
}

function formatSessionDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "—";
  }
}

export function PatientTimeline({ timeline, className }: PatientTimelineProps) {
  return (
    <Card className={`overflow-hidden border-border/80 bg-card shadow-xs ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 p-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <CardTitle className="text-base font-bold text-foreground">
              Linha do Tempo dos Atendimentos
            </CardTitle>
          </div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {timeline.length} {timeline.length === 1 ? "sessão recente" : "sessões recentes"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 py-8 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Ainda não há atendimentos registrados</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
              Quando você iniciar uma sessão no Copilot 2.0, ela aparecerá automaticamente nesta linha do tempo.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
            {timeline.map((session, idx) => {
              const formattedDate = formatSessionDate(session.date);

              return (
                <div key={session.sessionId} className="relative group">
                  {/* Timeline point */}
                  <div
                    className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 bg-white ${
                      idx === 0
                        ? "border-teal-600 bg-teal-600 ring-4 ring-teal-100"
                        : "border-border-strong group-hover:border-teal-500"
                    }`}
                  />

                  <div className="rounded-lg border border-border/80 bg-card p-4 transition-all hover:border-border hover:shadow-2xs space-y-3">
                    {/* Header of session card */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {formattedDate}
                        </span>
                        {idx === 0 && (
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                            Última sessão
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {session.hasTranscript && (
                          <span className="inline-flex items-center gap-1 rounded bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Áudio gravado
                          </span>
                        )}
                        {session.hasInsights && (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800 border border-teal-100">
                            Insights gerados
                          </span>
                        )}
                        <Button asChild size="sm" variant="secondary" className="h-7 text-xs font-semibold text-teal-800 border-teal-200 bg-teal-50 hover:bg-teal-100 ml-1">
                          <Link href={`/sessions/${session.sessionId}`}>
                            Abrir sessão
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Temas da sessão */}
                    {session.themes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">Temas:</span>
                        {session.themes.map((theme, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/90"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Resumo da sessão */}
                    {session.summary.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-2.5 rounded-md">
                        {session.summary.map((bullet, i) => (
                          <p key={i} className="leading-relaxed flex items-start gap-1.5">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{bullet}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Próximos passos */}
                    {session.nextSteps.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <strong className="text-foreground/80 font-semibold">Próximos passos acordados: </strong>
                        <span>{session.nextSteps.join(" • ")}</span>
                      </div>
                    )}

                    {/* Riscos da sessão */}
                    {session.risks.length > 0 && (
                      <div className="rounded border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-900">
                        {session.risks.map((r, i) => (
                          <p key={i}>
                            <strong>Sinal de atenção ({r.type}):</strong> {r.note}
                          </p>
                        ))}
                      </div>
                    )}
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
