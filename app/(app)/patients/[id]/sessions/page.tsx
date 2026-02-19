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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const res = await fetch(`/api/patients/${id}/sessions`, { cache: "no-store" });
      const json = (await res.json()) as { sessions: Session[] } | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao carregar sessões");
        return;
      }
      if ("sessions" in json) setSessions(json.sessions);
    }

    void load();
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Histórico de atendimentos</h1>
          <div className="text-xs text-muted-foreground">Paciente: {id}</div>
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
        <CardContent className="admin-card__content">
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem sessões ainda.</div>
          ) : (
            <div className="divide-y rounded-md border border-border bg-card">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 text-sm">
                  <div className="font-medium text-foreground">Sessão {session.id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {session.created_at
                      ? new Date(session.created_at).toLocaleDateString("pt-BR")
                      : "—"}
                    {" · "}
                    consentimento: {session.consented ? "sim" : "não"}
                  </div>
                  {session.consent_text ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {session.consent_text}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
