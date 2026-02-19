"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function SessionsIndexPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Array<Session & { patient_name?: string }>>([]);
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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-foreground">Sessões</div>
        <div className="mt-1 text-sm text-muted-foreground">Lista recente (por paciente)</div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recentes</CardTitle>
          <CardDescription>Abra uma sessão para ver transcrição e suporte IA</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="divide-y rounded-md border border-border bg-card">
            {sessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Sem sessões ainda.</div>
            ) : (
              sessions.slice(0, 20).map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block px-4 py-3 text-sm hover:bg-background"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-foreground">
                      {s.patient_name ?? "Paciente"}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.created_at ?? ""}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">sessão: {s.id}</div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
