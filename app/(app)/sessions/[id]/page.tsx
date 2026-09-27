"use client";

import { use, useCallback, useEffect, useState } from "react";
import { SessionWorkspace, type SessionMode } from "@/components/copilot/SessionWorkspace";
import type { RealtimeTranscriptItem } from "@/components/copilot/useCopilotStream";
import type { InsightsPackage } from "@/components/InsightCards";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionId = use(params).id;

  const [isLoading, setIsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [sessionPatientMemory, setSessionPatientMemory] = useState<string | null>(null);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsPackage | null>(null);
  const [initialMode, setInitialMode] = useState<SessionMode>("PRE_SESSION");
  const [initialChunks, setInitialChunks] = useState<RealtimeTranscriptItem[]>([]);
  const [isResuming, setIsResuming] = useState(false);

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  const loadSessionData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Busca metadados da sessão (patient_name, patient_id, created_at)
      const sessionRes = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
      if (sessionRes.ok) {
        const sessionJson = (await sessionRes.json()) as {
          session?: { patient_id?: string; created_at?: string };
          patient_name?: string | null;
        };
        if (sessionJson.session?.patient_id) {
          setPatientId(sessionJson.session.patient_id);
        }
        if (typeof sessionJson.patient_name === "string") {
          setPatientName(sessionJson.patient_name);
        }
        if (sessionJson.session?.created_at) {
          setLastSessionDate(sessionJson.session.created_at);
        }
      }

      // 2. Busca insights já persistidos da sessão
      let hasFullInsights = false;
      let loadedInsightsPkg: InsightsPackage | null = null;
      const insightsRes = await fetch(`/api/sessions/${sessionId}/insights`, { cache: "no-store" });
      if (insightsRes.ok) {
        const insightsJson = (await insightsRes.json()) as {
          insights?: Array<{ kind: string; content_json: unknown; archived_at?: string | null }>;
          patientMemory?: string | null;
        };

        if (insightsJson.patientMemory && typeof insightsJson.patientMemory === "string") {
          setSessionPatientMemory(insightsJson.patientMemory);
        }

        const rawInsights = Array.isArray(insightsJson.insights) ? insightsJson.insights : [];
        const activeInsights = rawInsights.filter((i) => !i.archived_at);

        const pkg: Partial<InsightsPackage> = {};
        for (const row of activeInsights) {
          const content = row.content_json;
          if (!isRecord(content)) continue;

          if (row.kind === "themes") {
            const v = content.themes;
            if (Array.isArray(v)) pkg.themes = v as InsightsPackage["themes"];
          }
          if (row.kind === "questions") {
            const v = content.questions;
            if (Array.isArray(v)) pkg.questions = v as InsightsPackage["questions"];
          }
          if (row.kind === "hypotheses") {
            const v = content.hypotheses;
            if (Array.isArray(v)) pkg.hypotheses = v as InsightsPackage["hypotheses"];
          }
          if (row.kind === "risks") {
            const v = content.risks;
            if (Array.isArray(v)) pkg.risks = v as InsightsPackage["risks"];
          }
          if (row.kind === "summary") {
            const v = content.summary;
            if (isRecord(v) && Array.isArray(v.bullets)) {
              pkg.summary = v as InsightsPackage["summary"];
            }
          }
          if (row.kind === "next_steps") {
            const v = content.next_steps;
            if (Array.isArray(v)) pkg.next_steps = v as InsightsPackage["next_steps"];
          }
        }

        if (
          pkg.themes &&
          pkg.questions &&
          pkg.hypotheses &&
          pkg.risks &&
          pkg.summary &&
          pkg.next_steps
        ) {
          hasFullInsights = true;
          loadedInsightsPkg = pkg as InsightsPackage;
          setInsights(loadedInsightsPkg);
        }
      }

      // 3. Busca trechos gravados existentes
      let loadedChunks: RealtimeTranscriptItem[] = [];
      const transcriptRes = await fetch(`/api/sessions/${sessionId}/transcript`, { cache: "no-store" });
      if (transcriptRes.ok) {
        const transcriptJson = (await transcriptRes.json()) as {
          chunks?: Array<{
            id: string;
            text: string;
            speaker?: string | null;
            t_start_seconds?: number | null;
            t_end_seconds?: number | null;
            created_at?: string;
          }>;
        };
        if (Array.isArray(transcriptJson.chunks)) {
          loadedChunks = transcriptJson.chunks.map((c) => ({
            id: c.id,
            text: c.text,
            speaker: c.speaker || undefined,
            isFinal: true,
            tStartSeconds: c.t_start_seconds ?? undefined,
            tEndSeconds: c.t_end_seconds ?? undefined,
            timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
          }));
          setInitialChunks(loadedChunks);
        }
      }

      // 4. Determina o modo inicial inteligente e confiável:
      // A) Sessão concluída (possui insights completos persistidos) -> POST_SESSION
      // B) Sessão interrompida/em andamento (chunks > 0, sem insights completos) -> PRE_SESSION com estado de retomada
      // C) Sessão nova (0 chunks, 0 insights) -> PRE_SESSION com CTA normal
      if (hasFullInsights) {
        setInitialMode("POST_SESSION");
        setIsResuming(false);
      } else if (loadedChunks.length > 0) {
        setInitialMode("PRE_SESSION");
        setIsResuming(true);
      } else {
        setInitialMode("PRE_SESSION");
        setIsResuming(false);
      }
    } catch (err) {
      console.error("[SessionPage] Erro ao carregar dados da sessão:", err);
      setInitialMode("PRE_SESSION");
      setIsResuming(false);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSessionData();
  }, [loadSessionData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200/60 shadow-xs">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" stroke="currentColor" strokeWidth="4" />
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Carregando Copilot 2.0...
        </p>
      </div>
    );
  }

  return (
    <SessionWorkspace
      sessionId={sessionId}
      patientId={patientId}
      patientName={patientName}
      patientMemory={sessionPatientMemory}
      lastSessionDate={lastSessionDate}
      initialMode={initialMode}
      initialInsights={insights}
      initialChunks={initialChunks}
      isResuming={isResuming}
    />
  );
}
