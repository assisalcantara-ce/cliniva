"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DonutCard } from "@/components/dashboard/DonutCard";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Therapist = {
  id: string;
  display_name: string;
  created_at?: string | null;
};

type Patient = {
  id: string;
  full_name: string;
  notes: string | null;
  created_at?: string;
};

type Session = {
  id: string;
  patient_id: string;
  therapist_id: string;
  consented: boolean;
  consent_text: string | null;
  created_at?: string;
};

type Material = {
  id: string;
  title: string;
  source: string;
  filename: string | null;
  storage_path: string | null;
  created_at?: string;
};

function parseDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDayLabel(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function formatDateTime(value?: string) {
  const d = parseDateOrNull(value);
  if (!d) return "—";
  return d.toLocaleString("pt-BR");
}

export default function DashboardPage() {
  const isDev = process.env.NODE_ENV === "development";

  const [seedResult, setSeedResult] = useState<Therapist | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sessionsLast7Days, setSessionsLast7Days] = useState<number | null>(null);
  const [allSessions, setAllSessions] = useState<Array<Session & { patient_name?: string }>>([]);
  const [latestSessions, setLatestSessions] = useState<Array<Session & { patient_name?: string }>>(
    []
  );

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patients) map.set(p.id, p.full_name);
    return map;
  }, [patients]);

  const materialsBySource = useMemo(() => {
    const manual = materials.filter((m) => m.source === "manual").length;
    const upload = materials.length - manual;
    return [
      { name: "Manual", value: manual },
      { name: "Arquivo", value: upload },
    ];
  }, [materials]);

  const sessionsByDay = useMemo(() => {
    const now = new Date();
    const days: Array<{ day: string; sessions: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ day: formatDayLabel(d), sessions: 0 });
    }

    const dayIndex = new Map<string, number>();
    days.forEach((row, idx) => dayIndex.set(row.day, idx));

    const nowMs = now.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const s of allSessions) {
      const d = parseDateOrNull(s.created_at);
      if (!d) continue;
      if (nowMs - d.getTime() > sevenDaysMs) continue;
      d.setHours(0, 0, 0, 0);
      const key = formatDayLabel(d);
      const idx = dayIndex.get(key);
      if (idx == null) continue;
      days[idx] = { ...days[idx], sessions: days[idx].sessions + 1 };
    }

    return days;
  }, [allSessions]);

  const consentRate = useMemo(() => {
    if (allSessions.length === 0) return 0;
    const yes = allSessions.filter((s) => s.consented).length;
    return Math.round((yes / allSessions.length) * 100);
  }, [allSessions]);

  async function runSeed() {
    setIsSeeding(true);
    setSeedError(null);
    setSeedResult(null);
    try {
      const res = await fetch("/api/seed/therapist", { method: "POST" });
      const json = (await res.json()) as { therapist: Therapist } | { error: string };
      if (!res.ok) {
        setSeedError("error" in json ? json.error : "Falha ao criar terapeuta de teste");
        return;
      }
      if ("therapist" in json) setSeedResult(json.therapist);
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : "Falha ao criar terapeuta de teste");
    } finally {
      setIsSeeding(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [patientsRes, materialsRes] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/materials", { cache: "no-store" }),
      ]);

      if (patientsRes.ok) {
        const json = (await patientsRes.json()) as { patients: Patient[] } | { error: string };
        if ("patients" in json) setPatients(json.patients);
      }

      if (materialsRes.ok) {
        const json = (await materialsRes.json()) as { materials: Material[] } | { error: string };
        if ("materials" in json) setMaterials(json.materials);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    async function loadSessionsAggregate() {
      if (patients.length === 0) {
        setSessionsLast7Days(0);
        setLatestSessions([]);
        return;
      }

      const sessionRows: Session[] = [];
      await Promise.all(
        patients.map(async (p) => {
          const res = await fetch(`/api/patients/${p.id}/sessions`, { cache: "no-store" });
          if (!res.ok) return;
          const json = (await res.json()) as { sessions: Session[] } | { error: string };
          if ("sessions" in json) sessionRows.push(...json.sessions);
        })
      );

      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const enriched = sessionRows
        .map((s) => ({ ...s, patient_name: patientNameById.get(s.patient_id) }))
        .sort((a, b) => {
          const da = parseDateOrNull(a.created_at)?.getTime() ?? 0;
          const db = parseDateOrNull(b.created_at)?.getTime() ?? 0;
          return db - da;
        });

      const count7d = enriched.filter((s) => {
        const t = parseDateOrNull(s.created_at)?.getTime();
        if (!t) return false;
        return now - t <= sevenDaysMs;
      }).length;

      setSessionsLast7Days(count7d);
      setAllSessions(enriched);
      setLatestSessions(enriched.slice(0, 6));
    }

    void loadSessionsAggregate();
  }, [patients, patientNameById]);

  return (
    <div className="patients-page space-y-6">
      <div className="page-header">
        <div className="title-row">
          <svg
            className="title-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: "40px", height: "40px" }}
          >
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#0f766e" strokeWidth="2" />
            <path d="M7 8h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 12h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 16h6" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="page-title" style={{ fontSize: "32px" }}>
              Dashboard
            </h1>
            <div className="text-xs text-muted-foreground/80">
              Visao geral com dados reais do consultorio
            </div>
          </div>
        </div>
      </div>

      {seedError ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{seedError}</CardContent>
        </Card>
      ) : seedResult ? (
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Terapeuta</CardTitle>
            <CardDescription>Terapeuta de teste criado com sucesso.</CardDescription>
          </CardHeader>
          <CardContent className="admin-card__content space-y-1 text-sm">
            <div className="text-muted-foreground">{seedResult.display_name}</div>
            <div className="text-xs text-muted-foreground/80">ID: {seedResult.id}</div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard title="Pacientes" value={patients.length} subtitle="Total cadastrados" />
        <StatCard
          title="Sessões"
          value={sessionsLast7Days == null ? "—" : sessionsLast7Days}
          subtitle="Últimos 7 dias"
        />
        <StatCard title="Materiais" value={materials.length} subtitle="Indexados para suporte" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Sessões por dia" subtitle="Últimos 7 dias">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sessionsByDay} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(71, 85, 105, 0.15)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "rgba(71, 85, 105, 0.9)", fontSize: 12 }} />
              <YAxis tick={{ fill: "rgba(71, 85, 105, 0.9)", fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Materiais por origem" subtitle="Manual vs. upload">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={materialsBySource} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(71, 85, 105, 0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "rgba(71, 85, 105, 0.9)", fontSize: 12 }} />
              <YAxis tick={{ fill: "rgba(71, 85, 105, 0.9)", fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutCard title="Consentimentos" value={consentRate} label="Taxa de consentimento nas sessões recentes" />

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="admin-card__title">Últimas sessões</CardTitle>
                <CardDescription>Mais recentes (por paciente)</CardDescription>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total: <span className="text-sm font-semibold text-foreground">{latestSessions.length}</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="admin-card__content p-0">
            {latestSessions.length === 0 ? (
              <div className="p-6 text-sm text-center text-muted-foreground">Sem sessões ainda.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white border-b border-teal-800">
                  <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-bold uppercase tracking-wide">
                    <div className="col-span-7">Paciente</div>
                    <div className="col-span-5 text-right">Data do atendimento</div>
                  </div>
                </div>
                {latestSessions.slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block px-6 py-4 text-sm hover:bg-gray-50 transition-all"
                  >
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7">
                        <div className="font-semibold text-foreground">
                          {s.patient_name ?? "Paciente"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground/80">
                          {s.consented ? "Consentido" : "Sem consentimento"}
                        </div>
                      </div>
                      <div className="col-span-5 text-xs text-muted-foreground/80 text-right">
                        {formatDateTime(s.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
