"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DayAppointmentItem {
  id: string;
  patientId?: string;
  patientName: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes?: string | null;
  sessionId?: string | null;
}

export interface DayTimeSlot {
  time: string;
}

interface DaySchedulePanelProps {
  selectedDate: string; // YYYY-MM-DD
  appointments: DayAppointmentItem[];
  availableSlots: DayTimeSlot[];
  isLoadingSlots?: boolean;
  onSelectSlot?: (time: string) => void;
  onOpenNewAppointmentWithDate?: (date: string, time?: string) => void;
  onStartSession?: (patientId: string, appointmentId?: string) => Promise<void> | void;
  startingSessionPatientId?: string | null;
  isDateClosed?: boolean;
  hasPastSlotsOnly?: boolean;
  isFullyBooked?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

function formatFullDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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

export function DaySchedulePanel({
  selectedDate,
  appointments,
  availableSlots,
  isLoadingSlots = false,
  onSelectSlot,
  onOpenNewAppointmentWithDate,
  onStartSession,
  startingSessionPatientId,
  isDateClosed = false,
  hasPastSlotsOnly = false,
  isFullyBooked = false,
  hasUnsavedChanges = false,
  className,
}: DaySchedulePanelProps) {
  const formattedDate = formatFullDate(selectedDate);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Confirmado
          </span>
        );
      case "requested":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Solicitado
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* Appointments Card */}
      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="border-b border-border/70 p-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Atendimentos do Dia
              </span>
              <CardTitle className="text-base font-bold text-foreground capitalize mt-0.5">
                {formattedDate}
              </CardTitle>
            </div>
            <span className="inline-flex items-center self-start rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {appointments.length} {appointments.length === 1 ? "atendimento" : "atendimentos"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 py-5 sm:py-6 text-center px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum atendimento neste dia</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                Aproveite os horários disponíveis para agendar novos atendimentos.
              </p>
              {onOpenNewAppointmentWithDate && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenNewAppointmentWithDate(selectedDate)}
                  className="mt-2.5 text-xs font-semibold"
                >
                  + Agendar para este dia
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const startTime = formatTime(appt.scheduledStart);
                const endTime = formatTime(appt.scheduledEnd);
                const isCancelled = appt.status === "cancelled";

                return (
                  <div
                    key={appt.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isCancelled
                        ? "border-border/60 bg-muted/15 opacity-60"
                        : "border-border/80 bg-white shadow-2xs hover:border-teal-300"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {startTime} — {endTime}
                          </span>
                          {getStatusBadge(appt.status)}
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {appt.patientName ?? "Paciente sem nome"}
                        </h4>
                        {appt.notes ? (
                          <p className="text-xs text-muted-foreground line-clamp-1 italic">
                            “{appt.notes}”
                          </p>
                        ) : null}
                      </div>

                      {/* Clinical / Copilot Action */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {appt.sessionId ? (
                          <Link href={`/sessions/${appt.sessionId}`}>
                            <Button
                              size="sm"
                              className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium gap-1.5 shadow-2xs"
                            >
                              <span>Copilot 2.0</span>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </Button>
                          </Link>
                        ) : appt.patientId ? (
                          <div className="flex items-center gap-1.5">
                            {onStartSession ? (
                              <Button
                                size="sm"
                                onClick={() => onStartSession(appt.patientId!, appt.id)}
                                disabled={startingSessionPatientId === appt.patientId}
                                className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium gap-1.5 shadow-2xs"
                              >
                                <span>{startingSessionPatientId === appt.patientId ? "Iniciando..." : "Iniciar atendimento"}</span>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </Button>
                            ) : null}
                            <Link href={`/patients/${appt.patientId}`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 text-xs font-medium"
                              >
                                Prontuário
                              </Button>
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Slots Card */}
      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="border-b border-border/70 p-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Disponibilidade
              </span>
              <CardTitle className="text-sm font-bold text-foreground mt-0.5">
                Horários Livres do Dia
              </CardTitle>
            </div>
            {isLoadingSlots && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Carregando...
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {availableSlots.length === 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {isDateClosed
                  ? "Este dia da semana está fechado na sua grade de disponibilidade."
                  : hasPastSlotsOnly
                  ? "Todos os horários de atendimento de hoje já passaram."
                  : isFullyBooked
                  ? "Todos os horários deste dia estão ocupados por outros atendimentos ou bloqueios."
                  : "Nenhum horário disponível para esta data."}
              </p>
              {hasUnsavedChanges && (
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200">
                  Atenção: você possui alterações de disponibilidade não salvas. Vá até a aba Disponibilidade para salvar.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => {
                    if (onSelectSlot) onSelectSlot(slot.time);
                    if (onOpenNewAppointmentWithDate) {
                      onOpenNewAppointmentWithDate(selectedDate, slot.time);
                    }
                  }}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:border-teal-500 hover:bg-teal-50 hover:text-teal-900 transition-all"
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
