"use client";

import React from "react";
import {
  InsightCards,
  type InsightsPackage,
} from "@/components/InsightCards";
import { Button } from "@/components/ui/button";

interface PostSessionViewProps {
  sessionId: string;
  patientName?: string | null;
  patientMemory?: string | null;
  insights: InsightsPackage | null;
  isGenerating?: boolean;
  onGenerateFullInsights?: () => void;
  onFinishAndLeave: () => void;
}

export function PostSessionView({
  sessionId,
  patientName,
  patientMemory,
  insights,
  isGenerating,
  onGenerateFullInsights,
  onFinishAndLeave,
}: PostSessionViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Pós-Sessão · Síntese Clínica
          </span>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {patientName ? patientName : "Sessão Finalizada"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sessão ID: <span className="font-mono">{sessionId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onGenerateFullInsights && (
            <Button
              onClick={onGenerateFullInsights}
              disabled={isGenerating}
              variant="secondary"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              {isGenerating ? "Gerando..." : "Regerar Análise"}
            </Button>
          )}

          <Button
            onClick={onFinishAndLeave}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
          >
            Concluir e Voltar
          </Button>
        </div>
      </div>

      {/* Insights Content */}
      {insights ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <InsightCards
            pkg={insights}
            patientMemory={patientMemory}
          />
          <div className="border-t border-border/70 pt-4 text-center">
            <p className="text-xs text-muted-foreground/80 italic">
              Sugestões e hipóteses geradas por IA para apoio reflexivo do profissional. Não constituem diagnóstico ou diretiva clínica.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Síntese da Sessão em Processamento
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              A transcrição da sessão foi registrada com sucesso. Clique abaixo para gerar a consolidação clínica completa com hipóteses e próximos passos.
            </p>
          </div>
          {onGenerateFullInsights && (
            <Button
              onClick={onGenerateFullInsights}
              disabled={isGenerating}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isGenerating ? "Gerando síntese..." : "Gerar Síntese Completa"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
