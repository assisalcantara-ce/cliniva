"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeuDiaResponse } from "@/lib/db/dashboard";
import {
  TodayScheduleTimeline,
  MeuDiaEmptyState,
  MeuDiaSkeleton,
  MeuDiaErrorState,
  DashboardMetricCards,
  SessionsEvolutionChart,
  RecentPatientsList,
  PendingActivities,
} from "@/components/dashboard";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    const raw = d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MeuDiaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/meu-dia", {
        cache: "no-store",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json.error || "Não foi possível carregar os dados de hoje."
        );
      }

      const json = (await res.json()) as MeuDiaResponse;
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao carregar painel Meu Dia."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleStartSession = useCallback(
    async (patientId: string) => {
      if (isStartingSession) return;
      setIsStartingSession(true);
      try {
        const res = await fetch(`/api/patients/${patientId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consented: true }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "Falha ao iniciar sessão");
        }

        const json = (await res.json()) as { session?: { id: string } };
        if (json.session?.id) {
          router.push(`/sessions/${json.session.id}`);
        }
      } catch (err) {
        console.error("Erro ao iniciar sessão do atendimento:", err);
      } finally {
        setIsStartingSession(false);
      }
    },
    [isStartingSession, router]
  );

  if (isLoading) {
    return <MeuDiaSkeleton className="patients-page" />;
  }

  if (error || !data) {
    return (
      <div className="patients-page space-y-6">
        <MeuDiaErrorState
          onRetry={fetchData}
          message={error || "Erro de conexão ao carregar painel."}
        />
      </div>
    );
  }

  const formattedDate = formatDisplayDate(data.date);
  const greeting = getGreeting();

  return (
    <div
      className="min-h-screen bg-no-repeat bg-top"
      style={{
        backgroundImage: "url('/img/bg_dashboard.png')",
        backgroundSize: "100% auto",
        backgroundColor: "#FAF8F5",
      }}
    >
      <div className="mx-auto max-w-[1330px] px-6 sm:px-8 pt-7 pb-14 space-y-6">
        {/* Cabeçalho Clínico Acolhedor exatamente como no Mockup Aprovado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-h-[64px]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-[#087A68] border border-emerald-200/60 shadow-xs shrink-0">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 4 13C4 9.13 7.13 6 11 6c4.97 0 9 4.03 9 9 0 2.12-.74 4.07-1.97 5.61" />
                <path d="M12 10a4 4 0 0 0-4 4c0 1.66 1.01 3.08 2.45 3.68" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-[31px] font-semibold tracking-tight text-[#123D35] leading-tight">
                {greeting}, Dra. Cristiane
              </h1>
              <p className="text-[15px] font-medium text-[#486B63] mt-0.5">
                Bem-vinda ao seu consultório digital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              aria-label="Atualizar dados do dia"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#486B63] transition-all hover:bg-white hover:text-[#123D35] hover:shadow-2xs cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5 text-[#087A68]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        {/* 1. Quatro Indicadores Coloridos (Fundo Menta, Lavanda, Pêssego, Rosa) */}
        <DashboardMetricCards
          metrics={data.metrics}
          nextAppointment={data.nextAppointment}
        />

        {/* 2. Segunda Faixa: Agenda de Hoje (59%) + Atividades Pendentes (41%) */}
        <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-12">
          <div className="lg:col-span-7">
            {data.todaySchedule.length > 0 ? (
              <TodayScheduleTimeline
                schedule={data.todaySchedule}
                onStartSession={handleStartSession}
              />
            ) : (
              <MeuDiaEmptyState dateLabel={formattedDate} />
            )}
          </div>

          <div className="lg:col-span-5">
            <PendingActivities pendingSessions={data.pendingPostSessions} />
          </div>
        </div>

        {/* 3. Terceira Faixa: Evolução dos Atendimentos (Barras Agrupadas) (59%) + Pacientes Recentes (41%) */}
        <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SessionsEvolutionChart data={data.weeklyEvolution ?? []} />
          </div>
          <div className="lg:col-span-5">
            <RecentPatientsList patients={data.recentPatients ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
