import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PatientRecordErrorProps {
  message?: string;
  isNotFound?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function PatientRecordError({
  message,
  isNotFound = false,
  onRetry,
  className,
}: PatientRecordErrorProps) {
  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className="flex items-center gap-2 border-b border-border/70 pb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/patients">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para Pacientes
          </Link>
        </Button>
      </div>

      <Card className={isNotFound ? "border-border/80" : "border-rose-200 bg-rose-50/40"}>
        <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full mb-3.5 ${
              isNotFound ? "bg-muted text-muted-foreground" : "bg-rose-100 text-rose-700"
            }`}
          >
            {isNotFound ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <h3 className="text-base font-bold text-foreground">
            {isNotFound ? "Paciente não encontrado" : "Falha ao carregar prontuário"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {message ??
              (isNotFound
                ? "O paciente solicitado não existe ou você não possui permissão para acessá-lo."
                : "Ocorreu um erro ao carregar os dados clínicos deste paciente. Tente novamente.")}
          </p>

          <div className="mt-5 flex items-center gap-3">
            {onRetry && !isNotFound && (
              <Button onClick={onRetry} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
                Tentar novamente
              </Button>
            )}
            <Button asChild variant="secondary" size="sm" className="text-xs">
              <Link href="/patients">Ver lista de pacientes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
