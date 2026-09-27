"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MeuDiaScheduleItem } from "@/lib/db/dashboard";

interface TodayScheduleTimelineProps {
  schedule: MeuDiaScheduleItem[];
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

export function TodayScheduleTimeline({
  schedule,
  onStartSession,
  className,
}: TodayScheduleTimelineProps) {
  if (schedule.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Agenda de Hoje
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Linha do tempo dos atendimentos programados
            </p>
          </div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {schedule.length} {schedule.length === 1 ? "atendimento" : "atendimentos"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
          {schedule.map((item) => {
            const isCancelled = item.status === "cancelled";
            const startTimeStr = formatTime(item.scheduledStart);
            const endTimeStr = formatTime(item.scheduledEnd);

            return (
              <div
                key={item.appointmentId}
                className={`relative group ${isCancelled ? "opacity-60" : ""}`}
              >
                {/* Marcador do Ponto na Timeline */}
                <div
                  className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 bg-white ${
                    item.isNext
                      ? "border-teal-600 bg-teal-600 ring-4 ring-teal-100"
                      : isCancelled
                      ? "border-muted-foreground/40 bg-muted"
                      : "border-border-strong group-hover:border-teal-500"
                  }`}
                />

                {/* Bloco do Atendimento */}
                <div
                  className={`rounded-lg border p-4 transition-all ${
                    item.isNext
                      ? "border-teal-300 bg-teal-50/40 shadow-xs"
                      : isCancelled
                      ? "border-border/60 bg-muted/10"
                      : "border-border/70 bg-card hover:border-border hover:bg-muted/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {startTimeStr} — {endTimeStr}
                        </span>

                        {item.durationMinutes > 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            ({item.durationMinutes} min)
                          </span>
                        ) : null}

                        {item.isNext ? (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Em seguida
                          </span>
                        ) : null}

                        {item.hasActiveAlert && !isCancelled ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                            Sinal clínico prévio
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatPatientName(item.patientName)}
                        </span>
                        {item.status === "confirmed" ? (
                          <span className="text-[11px] font-medium text-emerald-700">
                            • Confirmado
                          </span>
                        ) : item.status === "requested" ? (
                          <span className="text-[11px] font-medium text-amber-700">
                            • Solicitado
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-rose-600 line-through">
                            • Cancelado
                          </span>
                        )}
                      </div>

                      {item.notes ? (
                        <p className="text-xs text-muted-foreground italic">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>

                    {/* Ações contextuais */}
                    {!isCancelled ? (
                      <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                        {item.sessionId ? (
                          <Button asChild size="sm" variant="secondary" className="h-8 text-xs font-medium text-teal-800 border-teal-200 bg-teal-50 hover:bg-teal-100">
                            <Link href={`/sessions/${item.sessionId}`}>
                              Abrir Sessão
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onStartSession?.(item.patientId)}
                            className="h-8 text-xs font-medium"
                          >
                            Iniciar Atendimento
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground">
                          <Link href={`/patients/${item.patientId}`}>Prontuário</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
