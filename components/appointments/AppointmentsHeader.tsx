"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export type AppointmentTab = "agenda" | "disponibilidade" | "bloqueios";

interface AppointmentsHeaderProps {
  activeTab: AppointmentTab;
  onTabChange: (tab: AppointmentTab) => void;
  onOpenNewAppointment: () => void;
  className?: string;
}

export function AppointmentsHeader({
  activeTab,
  onTabChange,
  onOpenNewAppointment,
  className,
}: AppointmentsHeaderProps) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Top Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 shadow-xs">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Agenda
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm pl-11">
            Organize seus atendimentos e acompanhe sua agenda.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onOpenNewAppointment}
            className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs gap-2 px-4 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo agendamento</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/80">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTabChange("agenda")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold sm:text-sm transition-all ${
              activeTab === "agenda"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Agenda & Calendário</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("disponibilidade")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold sm:text-sm transition-all ${
              activeTab === "disponibilidade"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Disponibilidade Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("bloqueios")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold sm:text-sm transition-all ${
              activeTab === "bloqueios"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span>Bloqueios & Férias</span>
          </button>
        </div>
      </div>
    </div>
  );
}
