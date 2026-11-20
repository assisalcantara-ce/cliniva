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

function getInitials(name: string): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RecentPatientsList({ patients }: RecentPatientsListProps) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_4px_18px_rgba(34,75,62,0.04)] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#205F52]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-bold text-[#25463E]">
              Pacientes Recentes
            </CardTitle>
          </div>
        </div>

        <Link
          href="/patients"
          className="text-xs font-semibold text-[#205F52] hover:text-[#18483E] inline-flex items-center gap-1 group"
        >
          Ver todos
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-xs text-[#5C7870]">
              Nenhum paciente cadastrado ainda.
            </p>
            <Button asChild size="sm" variant="ghost" className="mt-3 text-xs border border-emerald-200 text-[#205F52]">
              <Link href="/patients">Cadastrar Paciente</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {patients.map((p) => {
              const formattedName = formatPatientName(p.fullName);
              const lastDate = formatDate(p.lastSessionDate);
              const initials = getInitials(p.fullName);

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-[#FCFDFD] hover:bg-[#F7FAF9] transition-all gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-[#25463E] truncate leading-tight">
                          {formattedName}
                        </p>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800 border border-emerald-100">
                          Ativo
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C7870] truncate leading-tight mt-0.5">
                        Última sessão: {lastDate}
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs font-semibold text-[#205F52] border border-slate-200 hover:bg-slate-50 shrink-0 rounded-lg gap-1"
                  >
                    <Link href={`/patients/${p.id}`}>
                      <svg className="h-3 w-3 text-[#205F52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Prontuário
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
