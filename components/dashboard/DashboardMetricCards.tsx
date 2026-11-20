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
      {/* 1. Pacientes em acompanhamento (#E5F3EA) */}
      <Card
        className="rounded-2xl border border-[#D5E8DC] p-5 shadow-[0_4px_18px_rgba(34,75,62,0.06)] transition-all hover:shadow-md"
        style={{ backgroundColor: "#E5F3EA" }}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#205F52] uppercase tracking-wider">
              Pacientes em acompanhamento
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-[#205F52] shadow-2xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#25463E]">
                {activePatients}
              </span>
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-bold text-[#205F52]">
                Ativos
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5C7870]">
              Cadastrados e em acompanhamento
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/patients"
              className="text-xs font-semibold text-[#205F52] hover:text-[#18483E] inline-flex items-center gap-1 group"
            >
              Ver prontuários
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 2. Atendimentos do Mês (#ECECF9) */}
      <Card
        className="rounded-2xl border border-[#DFE0F4] p-5 shadow-[0_4px_18px_rgba(34,75,62,0.06)] transition-all hover:shadow-md"
        style={{ backgroundColor: "#ECECF9" }}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B4E7A] uppercase tracking-wider">
              Atendimentos do mês
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-[#4B4E7A] shadow-2xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="16" x2="16" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="8" x2="8" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" x2="21" y1="10" y2="10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#25463E]">
                {sessionsTotal || appointmentsMonth || 6}
              </span>
              <span className="text-xs font-medium text-[#4B4E7A]">
                {sessionsCompleted} concluídos
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5C7870]">
              {appointmentsMonth} agendamentos no mês
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/sessions"
              className="text-xs font-semibold text-[#4B4E7A] hover:text-[#383A5E] inline-flex items-center gap-1 group"
            >
              Histórico de sessões
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 3. Próximo Atendimento (#FFF0DF) */}
      <Card
        className="rounded-2xl border border-[#F4E1CB] p-5 shadow-[0_4px_18px_rgba(34,75,62,0.06)] transition-all hover:shadow-md"
        style={{ backgroundColor: "#FFF0DF" }}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8C5D23] uppercase tracking-wider">
              Próximo atendimento
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-[#8C5D23] shadow-2xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="12 7 12 12 15 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            {nextAppointment ? (
              <>
                <div className="text-2xl font-extrabold tracking-tight text-[#25463E] truncate">
                  Hoje • {formatTime(nextAppointment.scheduledStart)}
                </div>
                <p className="mt-1 text-xs font-medium text-[#25463E]/90 truncate">
                  {nextAppointment.patientName}
                </p>
                <div className="pt-2">
                  <Link
                    href={
                      nextAppointment.sessionId
                        ? `/sessions/${nextAppointment.sessionId}`
                        : `/patients/${nextAppointment.patientId}`
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#8C5D23] hover:bg-white shadow-2xs transition-transform hover:scale-105"
                    title="Acessar próximo atendimento"
                  >
                    →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold tracking-tight text-[#25463E]">
                  Livre
                </div>
                <p className="mt-1 text-xs text-[#5C7870]">
                  Sem consultas pendentes para hoje
                </p>
                <div className="pt-2">
                  <Link
                    href="/appointments"
                    className="text-xs font-semibold text-[#8C5D23] hover:text-[#6E4718] inline-flex items-center gap-1 group"
                  >
                    Ver agenda
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Pendências Clínicas (#FBEAE6) */}
      <Card
        className="rounded-2xl border border-[#F4D7D0] p-5 shadow-[0_4px_18px_rgba(34,75,62,0.06)] transition-all hover:shadow-md"
        style={{ backgroundColor: "#FBEAE6" }}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8C3A2C] uppercase tracking-wider">
              Pendências clínicas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-[#8C3A2C] shadow-2xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 14 2 2 4-4" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-[#25463E]">
              {pendingSessions}
            </div>
            <p className="mt-1 text-xs text-[#5C7870]">
              {pendingSessions > 0
                ? `${pendingSessions} aguardando síntese`
                : "Tudo em dia! 🎉"}
            </p>
          </div>
          <div className="pt-1">
            {pendingSessions > 0 ? (
              <span className="text-xs font-semibold text-[#8C3A2C]">
                Requer atenção pós-sessão
              </span>
            ) : (
              <span className="text-xs font-medium text-[#205F52]">
                Registros consolidados
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
