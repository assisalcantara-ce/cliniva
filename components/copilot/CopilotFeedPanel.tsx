import React from "react";
import { CopilotEventCard } from "./CopilotEventCard";
import { CopilotSilenceState } from "./CopilotSilenceState";
import type { CopilotEventItem } from "./useCopilotStream";

export interface CopilotFeedPanelProps {
  events: CopilotEventItem[];
  onDismiss?: (id: string) => void;
  onPin?: (id: string) => void;
  className?: string;
}

export const CopilotFeedPanel: React.FC<CopilotFeedPanelProps> = ({
  events,
  onDismiss,
  onPin,
  className = "",
}) => {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Copilot Assistivo
          </h2>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {events.length > 0 ? `${events.length} em foco` : "Silêncio ativo"}
        </span>
      </div>

      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        role="region"
        aria-live="polite"
        aria-label="Feed de eventos assistivos do Copilot"
      >
        {events.length === 0 ? (
          <CopilotSilenceState />
        ) : (
          events.map((event) => (
            <CopilotEventCard
              key={event.id}
              event={event}
              onDismiss={onDismiss}
              onPin={onPin}
            />
          ))
        )}
      </div>

      <div className="border-t border-border px-4 py-2.5 bg-muted/20 text-center">
        <p className="text-[10px] text-muted-foreground">
          Sugestões contextuais não diagnósticas · O julgamento clínico é sempre do profissional.
        </p>
      </div>
    </div>
  );
};
