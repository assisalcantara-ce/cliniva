"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";

export interface CalendarDayAppointment {
  id: string;
  patientName: string | null;
  scheduledStart: string;
  status: string;
}

interface CalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string | null; // YYYY-MM-DD
  onSelectDate: (dateKey: string) => void;
  appointmentsMap: Map<string, CalendarDayAppointment[]>;
  isDayAvailable?: (date: Date) => boolean;
  className?: string;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarDays(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days: { date: Date; inMonth: boolean; key: string }[] = [];

  const startWeekday = start.getDay();
  for (let i = 0; i < startWeekday; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() - (startWeekday - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    days.push({ date: d, inMonth: false, key });
  }

  for (let d = 1; d <= end.getDate(); d += 1) {
    const cur = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
      d,
    ).padStart(2, "0")}`;
    days.push({ date: cur, inMonth: true, key });
  }

  const totalCells = Math.ceil(days.length / 7) * 7;
  const lastDay = days[days.length - 1]?.date ?? end;
  const originalLength = days.length;
  for (let i = originalLength; i < totalCells; i += 1) {
    const next = new Date(lastDay);
    next.setDate(lastDay.getDate() + (i - originalLength + 1));
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
      next.getDate(),
    ).padStart(2, "0")}`;
    days.push({ date: next, inMonth: false, key });
  }

  return days;
}

function formatMonthLabel(date: Date) {
  const label = date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CalendarView({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  appointmentsMap,
  isDayAvailable,
  className,
}: CalendarViewProps) {
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
  }, []);

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  const goToPreviousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(todayKey);
  };

  const weekHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden ${
        className ?? ""
      }`}
    >
      {/* Calendar Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 p-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">
            {formatMonthLabel(currentMonth)}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={goToToday}
            className="text-xs font-semibold h-8"
          >
            Hoje
          </Button>
          <div className="flex items-center rounded-md border border-border bg-white shadow-2xs">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-l-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="h-4 w-px bg-border/60" />
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-r-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 text-center text-xs font-semibold text-muted-foreground py-2.5">
        {weekHeaders.map((header, idx) => (
          <div key={header} className={idx === 0 || idx === 6 ? "text-muted-foreground/70" : "text-foreground/80"}>
            {header}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/50">
        {days.map((dayItem) => {
          const isSelected = selectedDate === dayItem.key;
          const isToday = todayKey === dayItem.key;
          const dayAppointments = appointmentsMap.get(dayItem.key) ?? [];
          const count = dayAppointments.length;
          const available = isDayAvailable ? isDayAvailable(dayItem.date) : true;

          return (
            <button
              key={dayItem.key}
              type="button"
              onClick={() => onSelectDate(dayItem.key)}
              className={`group relative min-h-[90px] p-2 text-left transition-all sm:min-h-[105px] ${
                dayItem.inMonth
                  ? "bg-card hover:bg-teal-50/20"
                  : "bg-muted/15 text-muted-foreground/50 hover:bg-muted/30"
              } ${
                isSelected
                  ? "bg-teal-50/60 ring-2 ring-inset ring-teal-600 z-10"
                  : ""
              }`}
            >
              {/* Day Number and Badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isToday
                      ? "bg-teal-600 text-white shadow-xs"
                      : isSelected
                      ? "text-teal-900 font-extrabold"
                      : dayItem.inMonth
                      ? "text-foreground group-hover:text-teal-700"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {dayItem.date.getDate()}
                </span>

                {/* Day status tag */}
                {dayItem.inMonth && (
                  <div>
                    {!available ? (
                      <span className="text-[9px] font-semibold text-muted-foreground/60 px-1 py-0.5 rounded bg-muted/50">
                        Fechado
                      </span>
                    ) : count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200/70 px-1.5 py-0.2 text-[10px] font-bold text-teal-700">
                        {count} {count === 1 ? "atend." : "atend."}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Preview items */}
              <div className="mt-1.5 space-y-1">
                {dayAppointments.slice(0, 2).map((appt) => (
                  <div
                    key={appt.id}
                    className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/60 text-foreground border border-border/40 group-hover:border-teal-200/80"
                  >
                    <span className="font-semibold text-teal-800 mr-1">
                      {new Date(appt.scheduledStart).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="truncate">{appt.patientName ?? "Paciente"}</span>
                  </div>
                ))}
                {count > 2 && (
                  <div className="text-[9px] font-semibold text-muted-foreground pl-1">
                    +{count - 2} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
