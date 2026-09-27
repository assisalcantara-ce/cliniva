import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PatientNotesCardProps {
  notes: string | null;
  className?: string;
}

export function PatientNotesCard({ notes, className }: PatientNotesCardProps) {
  return (
    <Card className={`border-border/80 bg-card shadow-xs ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 p-4 sm:px-6">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <CardTitle className="text-base font-bold text-foreground">
            Anotações do Terapeuta
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {notes && notes.trim().length > 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {notes.trim()}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Nenhuma anotação geral registrada para este paciente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
