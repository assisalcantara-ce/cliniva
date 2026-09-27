import React from "react";
import type { CopilotEventType } from "@/lib/copilot/types";
import type { CopilotEventItem } from "./useCopilotStream";

export interface CopilotEventCardProps {
  event: CopilotEventItem;
  onDismiss?: (id: string) => void;
  onPin?: (id: string) => void;
}

const EVENT_TYPE_STYLES: Record<
  CopilotEventType,
  { label: string; badgeClasses: string; cardClasses: string; icon: string }
> = {
  POTENTIAL_RISK: {
    label: "Ponto de Atenção",
    badgeClasses: "border-red-200 bg-red-100 text-red-800",
    cardClasses: "border-red-200 bg-red-50/40 shadow-sm",
    icon: "⚠️",
  },
  CONEXAO: {
    label: "Conexão Histórica",
    badgeClasses: "border-violet-200 bg-violet-100 text-violet-800",
    cardClasses: "border-violet-200 bg-violet-50/40",
    icon: "🔗",
  },
  RECORRENCIA: {
    label: "Padrão Recorrente",
    badgeClasses: "border-blue-200 bg-blue-100 text-blue-800",
    cardClasses: "border-blue-200 bg-blue-50/40",
    icon: "🔁",
  },
  EXPLORAR: {
    label: "Oportunidade Clínica",
    badgeClasses: "border-teal-200 bg-teal-100 text-teal-800",
    cardClasses: "border-teal-200 bg-teal-50/40",
    icon: "💡",
  },
  ACOMPANHAR: {
    label: "Acompanhamento",
    badgeClasses: "border-amber-200 bg-amber-100 text-amber-800",
    cardClasses: "border-amber-200 bg-amber-50/40",
    icon: "👁️",
  },
  NOTA: {
    label: "Nota Clínica",
    badgeClasses: "border-slate-200 bg-slate-100 text-slate-700",
    cardClasses: "border-slate-200 bg-slate-50/40",
    icon: "📝",
  },
};

export const CopilotEventCard: React.FC<CopilotEventCardProps> = ({
  event,
  onDismiss,
  onPin,
}) => {
  const style = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES.NOTA;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${
        style.cardClasses
      } ${event.isPinned ? "ring-2 ring-violet-400" : ""}`}
      role="article"
      aria-label={`Evento do Copilot: ${style.label} - ${event.title}`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badgeClasses}`}
          >
            <span>{style.icon}</span>
            <span>{style.label}</span>
          </span>
          {event.urgency === "high" && event.type !== "POTENTIAL_RISK" && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
              Alta Urgência
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onPin && (
            <button
              type="button"
              onClick={() => onPin(event.id)}
              className={`rounded p-1 text-xs transition-colors hover:bg-black/5 ${
                event.isPinned ? "text-violet-700 font-bold" : "text-muted-foreground"
              }`}
              title={event.isPinned ? "Desafixar card" : "Fixar card no topo"}
              aria-label={event.isPinned ? "Desafixar evento" : "Fixar evento"}
            >
              📌
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(event.id)}
              className="rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
              title="Dispensar sugestão"
              aria-label="Dispensar sugestão"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Título & Descrição */}
      <div className="mt-2.5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {event.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {event.description}
        </p>
      </div>

      {/* Ação Sugerida */}
      {event.suggestedAction && (
        <div className="mt-2.5 rounded-lg border border-black/5 bg-white/70 px-3 py-2 text-xs">
          <span className="font-semibold text-foreground">Sugestão: </span>
          <span className="text-foreground/90">{event.suggestedAction}</span>
        </div>
      )}

      {/* Evidência / Citação */}
      {event.evidence?.quote && (
        <div className="mt-2 text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2">
          &ldquo;{event.evidence.quote}&rdquo;
        </div>
      )}
    </div>
  );
};
