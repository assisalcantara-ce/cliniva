"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DayAvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

interface WeeklyAvailabilityConfigProps {
  rules: DayAvailabilityRule[];
  onChangeRule: (dayOfWeek: number, patch: Partial<DayAvailabilityRule>) => void;
  onSave: () => Promise<void> | void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  hasUnsavedChanges?: boolean;
  errorMessage?: string | null;
  className?: string;
}

const weekDayLabels: { [key: number]: string } = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export function WeeklyAvailabilityConfig({
  rules,
  onChangeRule,
  onSave,
  isSaving = false,
  saveSuccess = false,
  hasUnsavedChanges = false,
  errorMessage = null,
  className,
}: WeeklyAvailabilityConfigProps) {
  return (
    <Card className={`rounded-xl border border-border/80 bg-card shadow-xs max-w-3xl ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 p-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Grade de Disponibilidade Semanal
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aqui você define quando normalmente realiza seus atendimentos clínicos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Alterações não salvas
              </span>
            )}
            <span className="inline-flex items-center self-start rounded-md bg-teal-50 border border-teal-200/70 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
              Fuso: Brasília (UTC-3)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            {errorMessage}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
            Disponibilidade semanal salva com sucesso!
          </div>
        )}

        {/* Table of days */}
        <div className="divide-y divide-border/60 rounded-lg border border-border/70 bg-white overflow-hidden shadow-2xs">
          {rules.map((rule) => {
            const isActive = Boolean(rule.is_active);
            const label = weekDayLabels[rule.day_of_week] ?? `Dia ${rule.day_of_week}`;

            return (
              <div
                key={rule.day_of_week}
                className={`grid grid-cols-12 items-center gap-3 p-3 sm:px-4 transition-colors ${
                  isActive ? "bg-white" : "bg-muted/15"
                }`}
              >
                {/* Day Name & Toggle */}
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => onChangeRule(rule.day_of_week, { is_active: !isActive })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? "bg-teal-600" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isActive ? "text-foreground" : "text-muted-foreground/70 line-through decoration-muted-foreground/40"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {/* Start Time */}
                <div className="col-span-3 sm:col-span-3">
                  <Input
                    type="time"
                    value={rule.start_time || "14:00"}
                    disabled={!isActive}
                    onChange={(e) =>
                      onChangeRule(rule.day_of_week, { start_time: e.target.value })
                    }
                    className={`h-9 text-xs rounded-md ${
                      !isActive ? "bg-muted/30 text-muted-foreground/50 border-border/40" : "bg-white text-foreground"
                    }`}
                  />
                </div>

                <div className="col-span-1 text-center text-xs text-muted-foreground font-medium">
                  até
                </div>

                {/* End Time */}
                <div className="col-span-3 sm:col-span-4">
                  <Input
                    type="time"
                    value={rule.end_time || "17:00"}
                    disabled={!isActive}
                    onChange={(e) =>
                      onChangeRule(rule.day_of_week, { end_time: e.target.value })
                    }
                    className={`h-9 text-xs rounded-md ${
                      !isActive ? "bg-muted/30 text-muted-foreground/50 border-border/40" : "bg-white text-foreground"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Os intervalos de atendimento são calculados em blocos de 60 minutos.
          </p>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="w-full sm:w-auto h-10 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-6 shadow-xs"
          >
            {isSaving ? "Salvando alterações..." : "Salvar Disponibilidade"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
