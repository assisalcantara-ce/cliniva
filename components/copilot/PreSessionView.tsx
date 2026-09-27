"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PreSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  isResuming?: boolean;
  onStartSession: () => void;
}

export function PreSessionView({
  sessionId,
  patientName,
  patientMemory,
  lastSessionDate,
  isResuming = false,
  onStartSession,
}: PreSessionViewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8 px-4">
      {/* Session Title Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
              {isResuming ? "Atendimento em Andamento" : "Preparação de Atendimento"}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              {patientName ? patientName : "Sessão Clínica"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID da sessão: <span className="font-mono">{sessionId}</span>
              {lastSessionDate && ` · Última sessão: ${lastSessionDate}`}
            </p>
          </div>

          <Button
            onClick={onStartSession}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm font-semibold text-sm px-6 h-11"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {isResuming ? "Retomar Atendimento" : "Iniciar Atendimento"}
          </Button>
        </div>
      </div>

      {/* Patient Memory / Context */}
      <Card className="border-violet-200 bg-violet-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z" />
                <path d="M19 11v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <CardTitle className="text-sm font-semibold text-violet-900">
              Memória do Paciente (Sessões Anteriores)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {patientMemory && patientMemory.trim().length > 0 ? (
            <p className="text-xs text-violet-950/80 leading-relaxed whitespace-pre-line">
              {patientMemory}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma memória clínica registrada ainda para este paciente. À medida que as sessões forem finalizadas, os principais padrões e hipóteses ficarão salvos aqui.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Guidelines / Privacy Banner */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <svg className="h-4 w-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Sobre o Copilot em Tempo Real
        </div>
        <p>
          Ao iniciar o atendimento, o Copilot monitorará a sessão de forma discreta, sugerindo hipóteses e temas pertinentes sem interferir no fluxo terapêutico. Nenhuma sugestão substitui o julgamento profissional.
        </p>
      </div>
    </div>
  );
}
