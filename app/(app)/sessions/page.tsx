"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Patient = {
  id: string;
  full_name: string;
};

type Session = {
  id: string;
  patient_id: string;
  consented: boolean;
  created_at?: string;
};

function parseDateOrNull(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatSessionDate(dateStr?: string): string {
  const d = parseDateOrNull(dateStr);
  if (!d) return "Data não informada";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSessionTime(dateStr?: string): string {
  const d = parseDateOrNull(dateStr);
  if (!d) return "";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name?: string): string {
  if (!name) return "PA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizePreview(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

type PeriodFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "consented" | "pending";

type DateGroupKey = "HOJE" | "ONTEM" | "ESTA SEMANA" | "OUTROS ATENDIMENTOS";

function getDateGroupKey(dateStr?: string): DateGroupKey {
  const d = parseDateOrNull(dateStr);
  if (!d) return "OUTROS ATENDIMENTOS";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - itemDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "HOJE";
  if (diffDays === 1) return "ONTEM";
  if (diffDays > 1 && diffDays <= 7) return "ESTA SEMANA";
  return "OUTROS ATENDIMENTOS";
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function SessionsIndexPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Array<Session & { patient_name?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal "Nova Sessão"
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionPatientId, setNewSessionPatientId] = useState("");
  const [newSessionConsented, setNewSessionConsented] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionError, setNewSessionError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);

      const patientsRes = await fetch("/api/patients", { cache: "no-store" });
      const patientsJson = (await patientsRes.json()) as { patients: Patient[] } | { error: string };
      if (!patientsRes.ok) {
        setError("error" in patientsJson ? patientsJson.error : "Falha ao carregar pacientes");
        return;
      }
      if (!("patients" in patientsJson)) return;
      setPatients(patientsJson.patients);

      const patientNameById = new Map<string, string>();
      for (const p of patientsJson.patients) patientNameById.set(p.id, p.full_name);

      const rows: Session[] = [];
      await Promise.all(
        patientsJson.patients.map(async (p) => {
          const res = await fetch(`/api/patients/${p.id}/sessions`, { cache: "no-store" });
          if (!res.ok) return;
          const json = (await res.json()) as { sessions: Session[] } | { error: string };
          if ("sessions" in json) rows.push(...json.sessions);
        })
      );

      const enriched = rows
        .map((s) => ({ ...s, patient_name: patientNameById.get(s.patient_id) }))
        .sort((a, b) => {
          const da = parseDateOrNull(a.created_at)?.getTime() ?? 0;
          const db = parseDateOrNull(b.created_at)?.getTime() ?? 0;
          return db - da;
        });

      setSessions(enriched);
    }

    void load();
  }, []);

  // Resetar página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, periodFilter, statusFilter, pageSize]);

  async function createSession() {
    if (!newSessionPatientId) {
      setNewSessionError("Selecione um paciente.");
      return;
    }
    setIsCreating(true);
    setNewSessionError(null);
    try {
      const res = await fetch(`/api/patients/${newSessionPatientId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: newSessionConsented }),
      });
      const json = (await res.json()) as { session?: { id: string }; error?: string };
      if (!res.ok || !json.session?.id) {
        setNewSessionError(json.error ?? "Erro ao criar sessão.");
        return;
      }
      router.push(`/sessions/${json.session.id}`);
    } catch {
      setNewSessionError("Erro de conexão.");
    } finally {
      setIsCreating(false);
    }
  }

  async function openPreview(session: Session & { patient_name?: string }) {
    setPreviewTitle(session.patient_name ?? "Paciente");
    setPreviewText("");
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}/transcript`, { cache: "no-store" });
      if (!res.ok) {
        setPreviewText("Não foi possível carregar a transcrição.");
        return;
      }
      const json = (await res.json()) as { chunks?: Array<{ text?: string }> };
      const last = json.chunks?.[json.chunks.length - 1];
      const text = typeof last?.text === "string" ? last.text : "";
      setPreviewText(text ? normalizePreview(text) : "Sem prévia registrada ainda.");
    } catch {
      setPreviewText("Erro ao consultar a prévia.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  // Estatísticas Rápidas (KPIs contextuais discretos)
  const totalSessionsCount = sessions.length;
  const uniquePatientsCount = useMemo(() => {
    return new Set(sessions.map((s) => s.patient_id)).size;
  }, [sessions]);

  const recentSessionsCount = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => {
      const d = parseDateOrNull(s.created_at);
      if (!d) return false;
      return now - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
    }).length;
  }, [sessions]);

  // Filtragem Geral
  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sessions.filter((s) => {
      // 1. Busca por nome
      if (normalizedQuery && !(s.patient_name ?? "").toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      // 2. Filtro de status
      if (statusFilter === "consented" && s.consented === false) return false;
      if (statusFilter === "pending" && s.consented !== false) return false;

      // 3. Filtro de período
      if (periodFilter !== "all") {
        const d = parseDateOrNull(s.created_at);
        if (!d) return false;
        const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((today.getTime() - itemDay.getTime()) / (1000 * 60 * 60 * 24));

        if (periodFilter === "today" && diffDays !== 0) return false;
        if (periodFilter === "week" && (diffDays < 0 || diffDays > 7)) return false;
        if (periodFilter === "month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, searchQuery, statusFilter, periodFilter]);

  // Cálculos de Paginação
  const totalItems = filteredSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSessions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, validCurrentPage, pageSize]);

  // Agrupamento cronológico apenas da página atual
  const groupedSessions = useMemo(() => {
    const groups: Record<DateGroupKey, Array<Session & { patient_name?: string }>> = {
      HOJE: [],
      ONTEM: [],
      "ESTA SEMANA": [],
      "OUTROS ATENDIMENTOS": [],
    };

    for (const s of paginatedSessions) {
      const key = getDateGroupKey(s.created_at);
      groups[key].push(s);
    }

    return groups;
  }, [paginatedSessions]);

  const groupOrder: DateGroupKey[] = ["HOJE", "ONTEM", "ESTA SEMANA", "OUTROS ATENDIMENTOS"];

  // Helper para botões de paginação numérica
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= validCurrentPage - delta && i <= validCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
  }, [totalPages, validCurrentPage]);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  return (
    <div className="patients-page space-y-6">
      {/* 1. CABEÇALHO */}
      <div className="page-header">
        <div className="title-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-700 shadow-2xs">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M7 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Sessões
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                Histórico dos atendimentos realizados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewSessionPatientId("");
              setNewSessionConsented(true);
              setNewSessionError(null);
              setIsNewSessionOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 active:bg-teal-800 transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Nova Sessão
          </button>
        </div>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {/* 2. RESUMO RÁPIDO (Indicadores Contextuais Discretos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{totalSessionsCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total de sessões</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{recentSessionsCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Sessões nos últimos 7 dias</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{uniquePatientsCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Pacientes atendidos</div>
          </div>
        </div>
      </div>

      {/* 3. BUSCA E FILTROS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Busca por paciente */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por paciente (nome)..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-[#F3FBF9] border-[#DBE5E1] rounded-xl focus:border-teal-500 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Período */}
          <div className="w-full md:w-48">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] px-3.5 py-2 text-sm text-slate-800 font-medium focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Todos os períodos</option>
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Este mês</option>
            </select>
          </div>

          {/* Filtro de Status */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] px-3.5 py-2 text-sm text-slate-800 font-medium focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="consented">Consentidos</option>
              <option value="pending">Sem consentimento</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. HISTÓRICO DE SESSÕES (Agrupamento por Período) */}
      <div className="space-y-6">
        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-3.5">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery || periodFilter !== "all" || statusFilter !== "all"
                ? "Nenhum atendimento corresponde aos filtros"
                : "Nenhuma sessão registrada ainda"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || periodFilter !== "all" || statusFilter !== "all"
                ? "Tente ajustar os filtros ou limpar o termo de busca para visualizar mais resultados."
                : "Inicie um atendimento clicando em 'Nova Sessão' para registrar transcrições e insights clínicos."}
            </p>
          </div>
        ) : (
          groupOrder.map((groupKey) => {
            const items = groupedSessions[groupKey];
            if (!items || items.length === 0) return null;

            return (
              <section key={groupKey} className="space-y-3">
                {/* Divisor de Período */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {groupKey}
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-slate-200/80" />
                </div>

                {/* Lista de Registros Clínicos */}
                <div className="space-y-2.5">
                  {items.map((s) => {
                    const patientName = s.patient_name ?? "Paciente sem identificação";
                    const initials = getInitials(patientName);
                    const isConsented = s.consented !== false;

                    return (
                      <div
                        key={s.id}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:border-teal-400/80 hover:shadow-xs transition-all"
                      >
                        {/* 1. Paciente & Identificação */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-800 font-bold text-xs shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/sessions/${s.id}`}
                              className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate block"
                            >
                              {patientName}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isConsented ? (
                                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Consentimento registrado
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  Sem consentimento
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Contexto Temporal & Status */}
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-xs">
                          {/* Data e Horário */}
                          <div className="flex flex-col sm:items-end">
                            <div className="font-semibold text-slate-800 text-sm">
                              {formatSessionDate(s.created_at)}
                            </div>
                            {formatSessionTime(s.created_at) && (
                              <div className="text-slate-500 text-xs mt-0.5">
                                às {formatSessionTime(s.created_at)}
                              </div>
                            )}
                          </div>

                          {/* Badge de Status */}
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                isConsented
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                  : "bg-amber-50 text-amber-700 border border-amber-200/70"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isConsented ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {isConsented ? "Consentido" : "Pendente"}
                            </span>
                          </div>
                        </div>

                        {/* 3. Ações Minimalistas */}
                        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => openPreview(s)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
                            title="Visualizar prévia da transcrição"
                          >
                            <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Prévia
                          </button>

                          <Link
                            href={`/sessions/${s.id}`}
                            className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Abrir histórico e copilot da sessão"
                          >
                            <span>Abrir</span>
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* 5. BARRA DE PAGINAÇÃO */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs">
            {/* Informações da página */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-800 font-semibold">{startItem}</strong> a{" "}
                <strong className="text-slate-800 font-semibold">{endItem}</strong> de{" "}
                <strong className="text-slate-800 font-semibold">{totalItems}</strong> atendimentos
              </span>

              {/* Seletor de itens por página */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-400">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-[#F3FBF9] px-2 py-1 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles de Navegação */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {/* Botão Anterior */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validCurrentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números das páginas */}
                <div className="flex items-center gap-1">
                  {paginationRange.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs font-medium text-slate-400">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    const isActive = pageNum === validCurrentPage;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-teal-600 text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-teal-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Botão Próxima */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. MODAL: NOVA SESSÃO */}
      {isNewSessionOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-base font-bold text-slate-900">Nova Sessão</div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Paciente *
                </label>
                <select
                  value={newSessionPatientId}
                  onChange={(e) => setNewSessionPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F3FBF9] px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Selecione um paciente cadastrado...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <input
                  type="checkbox"
                  id="consented"
                  checked={newSessionConsented}
                  onChange={(e) => setNewSessionConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="consented" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-semibold block text-slate-900">Consentimento do paciente</span>
                  O paciente autorizou o registro e suporte assistivo desta sessão clínica.
                </label>
              </div>

              {newSessionError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-medium text-red-700">
                  {newSessionError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSessionOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void createSession()}
                  disabled={isCreating}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 transition-all cursor-pointer shadow-2xs"
                >
                  {isCreating ? "Iniciando..." : "Iniciar Sessão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 7. MODAL: PRÉVIA DA SESSÃO */}
      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    Prévia da Transcrição
                  </div>
                  <div className="text-base font-bold text-slate-900">{previewTitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center py-10 text-xs font-semibold text-slate-500 gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                  Carregando transcrição da sessão...
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-[#F9FBFB] p-4 text-sm text-slate-800 leading-relaxed max-h-[360px] overflow-y-auto whitespace-pre-wrap">
                  {previewText}
                </div>
              )}
            </div>

            <div className="flex justify-end bg-slate-50/50 px-6 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
