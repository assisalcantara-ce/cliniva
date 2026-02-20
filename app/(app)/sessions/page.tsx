"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function parseDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTime(value?: string) {
  const d = parseDateOrNull(value);
  if (!d) return "—";
  return d.toLocaleString("pt-BR");
}

function normalizePreview(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export default function SessionsIndexPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Array<Session & { patient_name?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function openPreview(session: Session & { patient_name?: string }) {
    setPreviewTitle(session.patient_name ?? "Paciente");
    setPreviewText("");
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);

    try {
      const res = await fetch(`/api/sessions/${session.id}/transcript`, { cache: "no-store" });
      if (!res.ok) {
        setPreviewText("Nao foi possivel carregar a transcricao.");
        return;
      }
      const json = (await res.json()) as { chunks?: Array<{ text?: string }> };
      const last = json.chunks?.[json.chunks.length - 1];
      const text = typeof last?.text === "string" ? last.text : "";
      setPreviewText(text ? normalizePreview(text) : "Sem previa ainda.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSessions = normalizedQuery
    ? sessions.filter((s) => (s.patient_name ?? "").toLowerCase().includes(normalizedQuery))
    : sessions;

  return (
    <div className="patients-page space-y-0">
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
          <h1 className="page-title" style={{ fontSize: "32px" }}>
            Sessões
          </h1>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">Lista recente (por paciente)</div>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="admin-card mt-6">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <label className="label" style={{ margin: 0 }}>
                Paciente
              </label>
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome do paciente"
              className="control w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card mt-6">
        <CardHeader className="admin-card__header">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="admin-card__title text-lg font-bold">Recentes</CardTitle>
              <CardDescription>Abra uma sessão para ver transcrição e suporte IA</CardDescription>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Total: <span className="text-sm font-semibold text-foreground">{filteredSessions.length}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="admin-card__content p-0">
          <div className="divide-y divide-gray-200">
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white border-b border-teal-800">
              <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-bold uppercase tracking-wide">
                <div className="col-span-5">Paciente</div>
                <div className="col-span-3">Data</div>
                <div className="col-span-4 text-right">Sessao</div>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-8 text-sm text-center text-muted-foreground">Sem sessões ainda.</div>
            ) : (
              filteredSessions.slice(0, 20).map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-12 gap-3 px-6 py-4 text-sm items-center hover:bg-gray-50 transition-all"
                >
                  <div className="col-span-5">
                    <Link href={`/sessions/${s.id}`} className="block">
                      <div className="font-semibold text-foreground">
                        {s.patient_name ?? "Paciente"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/80">
                        {s.consented ? "Consentido" : "Sem consentimento"}
                      </div>
                    </Link>
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground/80">
                    {formatDateTime(s.created_at)}
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-2 text-xs text-muted-foreground/80">
                    <button
                      type="button"
                      onClick={() => openPreview(s)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      aria-label="Ver previa da transcricao"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Previa
                    </button>
                    <span className="text-right">{s.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Ultimo chunk
                </div>
                <div className="text-lg font-semibold text-foreground">{previewTitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                Fechar
              </button>
            </div>
            <div className="px-6 py-5">
              {isPreviewLoading ? (
                <div className="text-sm text-muted-foreground">Carregando previa...</div>
              ) : (
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {previewText}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
