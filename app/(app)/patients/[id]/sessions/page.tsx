"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Session = {
  id: string;
  consented: boolean;
  consent_text: string | null;
  created_at?: string;
};

export default function PatientSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/patients/${id}/sessions`, { cache: "no-store" });
    const json = (await res.json()) as { sessions: Session[]; patient_name?: string } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar sessões");
      return;
    }
    if ("sessions" in json) {
      setSessions(json.sessions);
      if (json.patient_name) setPatientName(json.patient_name);
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function deleteSession(sessionId: string) {
    setDeletingId(sessionId);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Falha ao deletar atendimento");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Falha ao deletar atendimento");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4 pt-[10px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Histórico de atendimentos</h1>
          <div className="text-sm text-muted-foreground mt-0.5">
            {patientName ?? <span className="text-xs opacity-60">{id}</span>}
          </div>
        </div>
        <Link
          href="/patients#listar"
          className="text-sm text-teal-700 hover:text-teal-800"
        >
          Voltar para pacientes
        </Link>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="admin-card">
        <CardHeader className="admin-card__header">
          <CardTitle className="admin-card__title">Sessões</CardTitle>
        </CardHeader>
        <CardContent className="admin-card__content p-0">
          {sessions.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">Sem sessões registradas.</div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session, idx) => {
                const date = session.created_at
                  ? new Date(session.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : null;
                const isDeleting = deletingId === session.id;
                const isConfirming = confirmId === session.id;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-700">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {date ?? `Sessão ${session.id.slice(0, 8)}…`}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${session.consented ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                            {session.consented ? "Consentido" : "Sem consentimento"}
                          </span>
                          {session.consent_text && (
                            <span className="truncate max-w-[180px] text-muted-foreground">
                              {session.consent_text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/sessions/${session.id}/history`}
                        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                      >
                        Ver atendimento
                      </Link>

                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void deleteSession(session.id)}
                            disabled={isDeleting}
                            className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-200 transition-colors disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(session.id)}
                          disabled={isDeleting}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? "Deletando…" : "Deletar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
