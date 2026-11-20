import React from "react";
import { Card } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Pacientes em acompanhamento (#EAF8F2) */}
      <Card
        className="relative overflow-hidden rounded-[18px] border border-[#D0EFE2] p-[22px] min-h-[150px] shadow-[0_4px_20px_rgba(34,75,62,0.04)] transition-all hover:shadow-md flex flex-col justify-between"
        style={{ backgroundColor: "#EAF8F2" }}
      >
        {/* Elemento decorativo translúcido no canto inferior direito */}
        <div className="absolute -bottom-3 -right-3 pointer-events-none opacity-20 text-[#087A68]">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#087A68] shadow-2xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-[17px] font-bold text-[#123D35] leading-snug">
            Pacientes em<br />acompanhamento
          </span>
        </div>

        <div className="relative z-10 flex items-baseline gap-2.5 pt-2">
          <span className="text-[34px] font-extrabold tracking-tight text-[#123D35] leading-none">
            {activePatients}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-[#087A68] shadow-2xs">
            Ativos
          </span>
        </div>
      </Card>

      {/* 2. Atendimentos do Mês (#F0EEFF) */}
      <Card
        className="relative overflow-hidden rounded-[18px] border border-[#E0DCFC] p-[22px] min-h-[150px] shadow-[0_4px_20px_rgba(34,75,62,0.04)] transition-all hover:shadow-md flex flex-col justify-between"
        style={{ backgroundColor: "#F0EEFF" }}
      >
        {/* Elemento decorativo translúcido no canto inferior direito */}
        <div className="absolute -bottom-3 -right-3 pointer-events-none opacity-20 text-[#6B5AED]">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          </svg>
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#6B5AED] shadow-2xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" x2="16" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" x2="8" y1="2" y2="6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="3" x2="21" y1="10" y2="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[17px] font-bold text-[#2A2369] leading-snug">
            Atendimentos<br />do mês
          </span>
        </div>

        <div className="relative z-10 flex items-baseline gap-2 pt-2">
          <span className="text-[34px] font-extrabold tracking-tight text-[#2A2369] leading-none">
            {sessionsTotal || appointmentsMonth || 6}
          </span>
          <span className="text-xs font-semibold text-[#6B5AED]">
            {sessionsCompleted} concluídos
          </span>
        </div>
      </Card>

      {/* 3. Próximo Atendimento (#FFF3E5) */}
      <Card
        className="relative overflow-hidden rounded-[18px] border border-[#FDE5CC] p-[22px] min-h-[150px] shadow-[0_4px_20px_rgba(34,75,62,0.04)] transition-all hover:shadow-md flex flex-col justify-between"
        style={{ backgroundColor: "#FFF3E5" }}
      >
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#D97706] shadow-2xs">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="12 7 12 12 15 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[17px] font-bold text-[#78350F] leading-snug">
              Próximo atendimento
            </span>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#D97706] shadow-2xs">
            →
          </div>
        </div>

        <div className="relative z-10 pt-2">
          {nextAppointment ? (
            <>
              <div className="text-[20px] font-extrabold tracking-tight text-[#78350F] leading-tight truncate">
                Hoje • {formatTime(nextAppointment.scheduledStart)}
              </div>
              <p className="text-xs font-medium text-[#92400E] truncate mt-0.5">
                {nextAppointment.patientName}
              </p>
            </>
          ) : (
            <>
              <div className="text-[22px] font-extrabold tracking-tight text-[#78350F] leading-tight">
                Agenda livre
              </div>
              <p className="text-xs text-[#92400E] mt-0.5">
                Sem atendimentos para hoje
              </p>
            </>
          )}
        </div>
      </Card>

      {/* 4. Pendências Clínicas (#FFF0F0) */}
      <Card
        className="relative overflow-hidden rounded-[18px] border border-[#FDDCDC] p-[22px] min-h-[150px] shadow-[0_4px_20px_rgba(34,75,62,0.04)] transition-all hover:shadow-md flex flex-col justify-between"
        style={{ backgroundColor: "#FFF0F0" }}
      >
        {/* Elemento decorativo translúcido no canto inferior direito */}
        <div className="absolute -bottom-3 -right-3 pointer-events-none opacity-20 text-[#E11D48]">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#E11D48] shadow-2xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <span className="text-[17px] font-bold text-[#881337] leading-snug">
            Pendências<br />clínicas
          </span>
        </div>

        <div className="relative z-10 flex items-baseline gap-2 pt-2">
          <span className="text-[34px] font-extrabold tracking-tight text-[#881337] leading-none">
            {pendingSessions}
          </span>
          <span className="text-xs font-semibold text-[#E11D48]">
            {pendingSessions > 0 ? "Requer atenção" : "Tudo em dia! 🎉"}
          </span>
        </div>
      </Card>
    </div>
  );
}
