"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeuDiaResponse } from "@/lib/db/dashboard";
import {
  NextAppointmentCard,
  TodayScheduleTimeline,
  ClinicalDayAlerts,
  PostSessionPendencies,
  MeuDiaEmptyState,
  MeuDiaSkeleton,
  MeuDiaErrorState,
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
  const isCompletelyEmpty =
    data.todaySchedule.length === 0 && data.pendingPostSessions.length === 0;

  return (
    <div className="patients-page space-y-6 pb-12">
      {/* Header Clínico "Meu Dia" */}
      <div className="page-header">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="title-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {greeting}
                </h1>
                <span className="hidden sm:inline-block text-muted-foreground/50">
                  •
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100">
                  Meu Dia
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                {formattedDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            aria-label="Atualizar dados do dia"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/10 hover:text-foreground shadow-xs"
          >
            <svg
              className="h-3.5 w-3.5"
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

      {isCompletelyEmpty ? (
        <MeuDiaEmptyState dateLabel={formattedDate} />
      ) : (
        <div className="space-y-6">
          {/* Hero: Próximo Atendimento Iminente */}
          {data.nextAppointment ? (
            <NextAppointmentCard
              appointment={data.nextAppointment}
              onStartSession={handleStartSession}
            />
          ) : null}

          {/* Grid Principal: Timeline de Hoje (2 cols) + Apoio Clínico & Pendências (1 col) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {data.todaySchedule.length > 0 ? (
                <TodayScheduleTimeline
                  schedule={data.todaySchedule}
                  onStartSession={handleStartSession}
                />
              ) : (
                <MeuDiaEmptyState dateLabel={formattedDate} />
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              {/* Alertas e Sinais de Atenção */}
              <ClinicalDayAlerts nextAppointment={data.nextAppointment} />

              {/* Pendências de Fechamento Pós-Sessão */}
              {data.pendingPostSessions.length > 0 ? (
                <PostSessionPendencies
                  pendingSessions={data.pendingPostSessions}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
