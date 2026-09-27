import React from "react";
import type { RealtimeTranscriptItem } from "./useCopilotStream";

export interface TranscriptBubbleProps {
  item: RealtimeTranscriptItem;
  isLatest?: boolean;
}

function formatSeconds(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const TranscriptBubble: React.FC<TranscriptBubbleProps> = React.memo(
  ({ item, isLatest = false }) => {
    const isTherapist = item.speaker?.toLowerCase().includes("terapeuta");
    const isInterim = !item.isFinal;
    const timeLabel = formatSeconds(item.tStartSeconds);

    return (
      <div
        className={`flex flex-col gap-1 transition-opacity duration-200 ${
          isInterim ? "opacity-75" : "opacity-100"
        } ${isLatest ? "animate-in fade-in duration-300" : ""}`}
        aria-live={isInterim ? "off" : "polite"}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isTherapist ? "bg-teal-500" : "bg-emerald-500"
            }`}
          />
          <span className="capitalize text-foreground font-semibold">
            {item.speaker || "Fala identificada"}
          </span>
          {timeLabel && <span>· {timeLabel}</span>}
          {isInterim && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 font-normal">
              em tempo real...
            </span>
          )}
        </div>

        <div
          className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
            isTherapist
              ? "border border-teal-100 bg-teal-50/40 text-teal-950"
              : isInterim
              ? "border border-dashed border-border bg-muted/40 text-muted-foreground italic"
              : "border border-border bg-card text-foreground"
          }`}
        >
          {item.text}
        </div>
      </div>
    );
  }
);

TranscriptBubble.displayName = "TranscriptBubble";
