"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MeuDiaEmptyStateProps {
  dateLabel?: string;
  className?: string;
}

export function MeuDiaEmptyState({
  className,
}: MeuDiaEmptyStateProps) {
  return (
    <Card
      className={`border border-border/70 bg-gradient-to-r from-white via-teal-50/15 to-white shadow-xs ${
        className ?? ""
      }`}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200/80 mt-0.5">
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Hoje sua agenda está livre.
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Um bom momento para preparar os próximos atendimentos ou colocar
                seu acompanhamento em dia.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <Button
              asChild
              className="h-8.5 px-3.5 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
            >
              <Link href="/appointments">Ver Agenda</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-8.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Link href="/patients">Cadastrar Paciente</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-8.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Link href="/materials">Preparar Materiais</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
