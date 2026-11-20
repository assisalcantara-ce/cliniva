import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetrics, MeuDiaNextAppointment } from "@/lib/db/dashboard";

interface DashboardMetricCardsProps {
  metrics?: DashboardMetrics;
  nextAppointment: MeuDiaNextAppointment | null;
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

export function DashboardMetricCards({
  metrics,
  nextAppointment,
}: DashboardMetricCardsProps) {
  const activePatients = metrics?.activePatientsCount ?? 0;
  const sessionsCompleted = metrics?.monthSessionsCompleted ?? 0;
  const sessionsTotal = metrics?.monthSessionsTotal ?? 0;
  const appointmentsMonth = metrics?.monthAppointmentsCount ?? 0;
  const pendingSessions = metrics?.pendingSessionsCount ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Pacientes Ativos */}
      <Card className="rounded-xl border border-border/70 bg-white p-5 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pacientes Ativos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {activePatients}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastrados e em acompanhamento
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/patients"
              className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 group"
            >
              Ver prontuários
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 2. Sessões do Mês */}
      <Card className="rounded-xl border border-border/70 bg-white p-5 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sessões do Mês
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {sessionsCompleted}
              </span>
              <span className="text-xs text-muted-foreground">
                concluídas / {sessionsTotal} totais
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {appointmentsMonth} agendamentos registrados no mês
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/sessions"
              className="text-xs font-medium text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 group"
            >
              Histórico de sessões
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 3. Próximo Atendimento */}
      <Card className="rounded-xl border border-border/70 bg-white p-5 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Próximo Atendimento
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            {nextAppointment ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {formatTime(nextAppointment.scheduledStart)}
                </div>
                <p className="mt-1 text-xs font-medium text-foreground/90 truncate">
                  {nextAppointment.patientName}
                </p>
                <div className="mt-2">
                  <Link
                    href={
                      nextAppointment.sessionId
                        ? `/sessions/${nextAppointment.sessionId}`
                        : `/patients/${nextAppointment.patientId}`
                    }
                    className="text-xs font-medium text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1 group"
                  >
                    Acessar atendimento
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  Livre
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sem consultas pendentes para hoje
                </p>
                <div className="pt-2 text-xs text-muted-foreground/80">
                  Agenda livre
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Pendências de Sessões e Sínteses */}
      <Card className="rounded-xl border border-border/70 bg-white p-5 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pendências Clínicas
            </span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              pendingSessions > 0
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
            }`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {pendingSessions}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingSessions === 1
                ? "Sessão aguardando síntese clínica"
                : pendingSessions > 1
                ? "Sessões aguardando síntese clínica"
                : "Tudo em dia! Nenhuma pendência"}
            </p>
          </div>
          <div className="pt-1">
            {pendingSessions > 0 ? (
              <span className="text-xs font-medium text-amber-800">
                Requer atenção pós-sessão
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-800">
                Registros consolidados
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
