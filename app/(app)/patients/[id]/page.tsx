"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Session = {
  id: string;
  patient_id: string;
  therapist_id: string;
  consented: boolean;
  consent_text: string | null;
  created_at?: string;
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const patientId = use(params).id;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [consented, setConsented] = useState(false);
  const [consentText, setConsentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/sessions`, { cache: "no-store" });
    const json = (await res.json()) as { sessions: Session[] } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar sessões");
      return;
    }
    if ("sessions" in json) setSessions(json.sessions);
  }, [patientId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consented,
          consent_text: consentText.trim().length ? consentText : undefined,
        }),
      });
      const json = (await res.json()) as { session: Session } | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao criar sessão");
        return;
      }
      setConsentText("");
      setConsented(false);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar sessão");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div>
        <div className="flex items-center gap-2">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="#0f766e" strokeWidth="2"/>
            <path d="M20 20c0-4.418-3.582-8-8-8s-8 3.582-8 8" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1 className="font-bold text-foreground" style={{fontSize: '32px'}}>Paciente</h1>
        </div>
        <div className="mt-1 text-xs text-muted-foreground/60">ID: {patientId}</div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nova sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSession} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="consented"
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="consented" className="text-sm font-medium text-foreground">
                  Consentimento obtido
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Texto do consentimento (opcional)
                </label>
                <textarea
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Criando..." : "Criar sessão"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border border-border bg-card">
              {sessions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Sem sessões ainda.</div>
              ) : (
                sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block p-4 text-sm hover:bg-primary/5"
                  >
                    <div className="font-medium text-foreground">Sessão {s.id}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      consentimento: {String(s.consented)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
