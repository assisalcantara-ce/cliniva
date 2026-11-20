"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
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
    <Card className="rounded-xl border border-border/70 bg-white shadow-xs">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              Evolução dos Atendimentos
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sessões realizadas e concluídas nas últimas semanas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPeriodFilter("all")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                periodFilter === "all"
                  ? "bg-white text-teal-800 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Últimas 6 semanas
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter("4weeks")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                periodFilter === "4weeks"
                  ? "bg-white text-teal-800 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Último mês (4 sem)
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Métricas rápidas da seleção */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
            <span>
              <strong className="text-foreground font-semibold">
                {totalConducted}
              </strong>{" "}
              sessões realizadas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>
              <strong className="text-foreground font-semibold">
                {totalCompleted}
              </strong>{" "}
              concluídas com síntese
            </span>
          </div>
        </div>

        {/* Gráfico Recharts */}
        {displayData.length === 0 || totalConducted === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] rounded-lg border border-dashed border-border/70 bg-muted/10 text-center p-4">
            <svg className="h-8 w-8 text-muted-foreground/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs font-semibold text-foreground">
              Ainda não há dados suficientes para este período
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
              Conforme você realizar atendimentos com o Copilot, a curva de evolução semanal será exibida aqui.
            </p>
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as DashboardWeeklyItem;
                      return (
                        <div className="rounded-lg border border-border bg-white p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{item.weekLabel}</p>
                          <p className="text-teal-700">
                            Total de Sessões: <strong>{item.totalSessions}</strong>
                          </p>
                          <p className="text-emerald-700">
                            Concluídas com Síntese: <strong>{item.completedSessions}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalSessions"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total de Sessões"
                />
                <Area
                  type="monotone"
                  dataKey="completedSessions"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Concluídas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
