"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MeuDiaErrorStateProps {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export function MeuDiaErrorState({
  onRetry,
  message = "Não foi possível carregar as informações do dia no momento.",
  className,
}: MeuDiaErrorStateProps) {
  return (
    <Card className={`border-rose-200/80 bg-rose-50/30 ${className ?? ""}`}>
      <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-foreground">
            Erro ao carregar Meu Dia
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {onRetry ? (
          <Button
            type="button"
            onClick={onRetry}
            className="h-9 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
          >
            Tentar Novamente
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
