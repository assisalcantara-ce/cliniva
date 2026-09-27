"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MeuDiaPendingPostSession } from "@/lib/db/dashboard";

interface PostSessionPendenciesProps {
  pendingSessions: MeuDiaPendingPostSession[];
  className?: string;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "—";
  }
}

function formatPatientName(name: string): string {
  if (!name || typeof name !== "string") return name;
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

export function PostSessionPendencies({
  pendingSessions,
  className,
}: PostSessionPendenciesProps) {
  if (pendingSessions.length === 0) {
    return null;
  }

  return (
    <Card className={`border-border/80 ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <CardTitle className="text-sm font-bold text-foreground">
              Pendências de Fechamento Pós-Sessão
            </CardTitle>
          </div>
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {pendingSessions.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {pendingSessions.map((session) => (
            <div
              key={session.sessionId}
              className="flex items-center justify-between p-4 text-xs transition-colors hover:bg-muted/10"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground text-sm">
                  {formatPatientName(session.patientName)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Atendimento em {formatDate(session.sessionDate)}</span>
                  <span>•</span>
                  <span>{session.chunksCount} {session.chunksCount === 1 ? "trecho gravado" : "trechos gravados"}</span>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                variant="secondary"
                className="h-8 text-xs font-semibold text-teal-800 border-teal-200 bg-teal-50 hover:bg-teal-100"
              >
                <Link href={`/sessions/${session.sessionId}`}>
                  Revisar e Gerar Resumo
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
