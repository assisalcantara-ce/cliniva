"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardWeeklyItem } from "@/lib/db/dashboard";

interface SessionsEvolutionChartProps {
  data: DashboardWeeklyItem[];
}

export function SessionsEvolutionChart({ data }: SessionsEvolutionChartProps) {
  const [periodFilter, setPeriodFilter] = useState<"all" | "4weeks">("all");

  const displayData =
    periodFilter === "4weeks" ? data.slice(-4) : data;

  const totalCompleted = displayData.reduce(
    (acc, item) => acc + item.completedSessions,
    0
  );
  const totalConducted = displayData.reduce(
    (acc, item) => acc + item.totalSessions,
    0
  );

  return (
    <Card className="rounded-[18px] border border-slate-200/80 bg-white/95 shadow-[0_4px_18px_rgba(34,75,62,0.04)] overflow-hidden">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-5 pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#087A68]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <CardTitle className="text-base font-bold text-[#123D35]">
              Evolução dos Atendimentos
            </CardTitle>
          </div>
          <p className="text-xs text-[#5C7870] mt-0.5">
            Sessões realizadas e concluídas nas últimas semanas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100/90 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPeriodFilter("all")}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                periodFilter === "all"
                  ? "bg-[#087A68] text-white shadow-2xs"
                  : "text-[#5C7870] hover:text-[#123D35]"
              }`}
            >
              Últimas 6 semanas
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter("4weeks")}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                periodFilter === "4weeks"
                  ? "bg-[#087A68] text-white shadow-2xs"
                  : "text-[#5C7870] hover:text-[#123D35]"
              }`}
            >
              Último mês
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Gráfico de Barras Agrupadas conforme Mockup Aprovado */}
        {displayData.length === 0 || totalConducted === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] rounded-lg border border-dashed border-border/70 bg-muted/10 text-center p-4">
            <svg className="h-8 w-8 text-muted-foreground/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs font-semibold text-[#123D35]">
              Ainda não há dados suficientes para este período
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
              Conforme você realizar atendimentos com o Copilot, as barras de evolução semanal serão exibidas aqui.
            </p>
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#5C7870" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#5C7870" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as DashboardWeeklyItem;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#123D35]">{item.weekLabel}</p>
                          <p className="text-[#087A68]">
                            Sessões Realizadas: <strong>{item.totalSessions}</strong>
                          </p>
                          <p className="text-[#10b981]">
                            Concluídas com Síntese: <strong>{item.completedSessions}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="totalSessions"
                  fill="#A2D8D0"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  name="Sessões Realizadas"
                />
                <Bar
                  dataKey="completedSessions"
                  fill="#087A68"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  name="Concluídas com síntese"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda inferior idêntica ao mockup */}
        <div className="flex items-center justify-center gap-8 text-xs text-[#5C7870] pt-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#A2D8D0]" />
            <span>
              Sessões realizadas ({totalConducted})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#087A68]" />
            <span>
              Concluídas com síntese ({totalCompleted})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
