import React, { useEffect, useRef } from "react";
import { TranscriptBubble } from "./TranscriptBubble";
import type { RealtimeTranscriptItem } from "./useCopilotStream";

export interface LiveTranscriptPanelProps {
  transcripts: RealtimeTranscriptItem[];
  interimTranscript?: string | null;
  className?: string;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcripts,
  interimTranscript,
  className = "",
}) => {
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suave para o final quando chegam novas falas
  useEffect(() => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [transcripts.length, interimTranscript]);

  return (
    <div
      className={`flex h-full flex-col rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transcrição ao Vivo
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {transcripts.length}{" "}
          {transcripts.length === 1 ? "fala registrada" : "falas registradas"}
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-5"
        role="log"
        aria-live="polite"
        aria-label="Transcrição da sessão em tempo real"
      >
        {transcripts.length === 0 && !interimTranscript ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="rounded-full bg-muted/60 p-3 text-muted-foreground mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 1.5a3 3 0 00-3 3v6a3 3 0 006 0v-6a3 3 0 00-3-3z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Aguardando fala...</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              O áudio capturado será transcrito aqui e analisado pelo Copilot em tempo real.
            </p>
          </div>
        ) : (
          <>
            {transcripts.map((item, idx) => (
              <TranscriptBubble
                key={item.id || `chunk-${idx}`}
                item={item}
                isLatest={idx === transcripts.length - 1}
              />
            ))}

            {interimTranscript && (
              <TranscriptBubble
                item={{
                  id: "interim-current",
                  text: interimTranscript,
                  speaker: "Em andamento",
                  isFinal: false,
                  timestamp: 0,
                }}
                isLatest
              />
            )}
            <div ref={bottomAnchorRef} />
          </>
        )}
      </div>
    </div>
  );
};
