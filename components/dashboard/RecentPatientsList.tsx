import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardRecentPatient } from "@/lib/db/dashboard";

interface RecentPatientsListProps {
  patients: DashboardRecentPatient[];
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return "Sem atendimentos";
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "—";
  }
}

function formatPatientName(name: string): string {
  if (!name) return "Paciente";
  const prepositions = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && prepositions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function RecentPatientsList({ patients }: RecentPatientsListProps) {
  return (
    <Card className="rounded-xl border border-border/70 bg-white shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Pacientes Recentes
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Acesso rápido ao prontuário e histórico
            </p>
          </div>
        </div>

        <Link
          href="/patients"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800"
        >
          Ver todos →
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhum paciente cadastrado ainda.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-3 text-xs">
              <Link href="/patients">Cadastrar Paciente</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {patients.map((p) => {
              const formattedName = formatPatientName(p.fullName);
              const lastDate = formatDate(p.lastSessionDate);

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/15 transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {formattedName}
                      </p>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {p.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Última sessão: {lastDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs font-semibold text-teal-800 border-teal-200 bg-teal-50 hover:bg-teal-100"
                    >
                      <Link href={`/patients/${p.id}`}>
                        Prontuário
                      </Link>
                    </Button>
                    {p.lastSessionId && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                      >
                        <Link href={`/sessions/${p.lastSessionId}`}>
                          Ver Sessão
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
