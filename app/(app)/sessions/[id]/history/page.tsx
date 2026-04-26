"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { InsightCards, type InsightsPackage } from "@/components/InsightCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Chunk = {
  id: string;
  text: string;
  speaker: string | null;
  t_start_seconds: number | null;
  t_end_seconds: number | null;
  created_at?: string;
};

type InsightRow = {
  id: string;
  kind: string;
  content_json: unknown;
  archived_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function buildPackage(rows: InsightRow[]): InsightsPackage | null {
  const pkg: Partial<InsightsPackage> = {};
  for (const row of rows) {
    const content = row.content_json;
    if (!isRecord(content)) continue;
    if (row.kind === "themes" && Array.isArray(content.themes))
      pkg.themes = content.themes as InsightsPackage["themes"];
    if (row.kind === "questions" && Array.isArray(content.questions))
      pkg.questions = content.questions as InsightsPackage["questions"];
    if (row.kind === "hypotheses" && Array.isArray(content.hypotheses))
      pkg.hypotheses = content.hypotheses as InsightsPackage["hypotheses"];
    if (row.kind === "risks" && Array.isArray(content.risks))
      pkg.risks = content.risks as InsightsPackage["risks"];
    if (row.kind === "summary" && isRecord(content.summary) && Array.isArray((content.summary as Record<string, unknown>).bullets))
      pkg.summary = content.summary as InsightsPackage["summary"];
    if (row.kind === "next_steps" && Array.isArray(content.next_steps))
      pkg.next_steps = content.next_steps as InsightsPackage["next_steps"];
  }
  if (pkg.themes && pkg.questions && pkg.hypotheses && pkg.risks && pkg.summary && pkg.next_steps)
    return pkg as InsightsPackage;
  return null;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionId = use(params).id;

  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [insights, setInsights] = useState<InsightsPackage | null>(null);
  const [archivedAt, setArchivedAt] = useState<Date | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, chunksRes, archivedRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`, { cache: "no-store" }),
        fetch(`/api/sessions/${sessionId}/transcript`, { cache: "no-store" }),
        fetch(`/api/sessions/${sessionId}/insights/archived`, { cache: "no-store" }),
      ]);

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          patient_name?: string | null;
          session?: { patient_id?: string | null; created_at?: string | null };
        };
        setPatientName(meta.patient_name ?? null);
        setPatientId(meta.session?.patient_id ?? null);
        setSessionDate(meta.session?.created_at ?? null);
      }

      if (chunksRes.ok) {
        const data = (await chunksRes.json()) as { chunks: Chunk[] };
        setChunks(data.chunks ?? []);
      }

      if (archivedRes.ok) {
        const data = (await archivedRes.json()) as { insights: InsightRow[] };
        const rows = data.insights ?? [];
        const pkg = buildPackage(rows);
        setInsights(pkg);
        if (rows.length > 0 && rows[0].archived_at) {
          setArchivedAt(new Date(rows[0].archived_at));
        }
      }
    } catch {
      setError("Falha ao carregar atendimento");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const formattedArchived = archivedAt
    ? archivedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6 pt-[10px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Atendimento encerrado
            </span>
            {formattedArchived && (
              <span className="text-[11px] text-muted-foreground">
                Encerrado em {formattedArchived}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {patientName ?? "Paciente"}
          </h1>
          {formattedDate && (
            <p className="text-sm text-muted-foreground">Sessão de {formattedDate}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {patientId && (
            <Link
              href={`/patients/${patientId}/sessions`}
              className="text-sm text-teal-700 hover:text-teal-800"
            >
              ← Histórico do paciente
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Coluna esquerda: Transcrição */}
          <Card className="admin-card">
            <CardHeader className="admin-card__header">
              <CardTitle className="admin-card__title">
                Transcrição
                <span className="ml-2 font-normal text-muted-foreground text-xs">
                  {chunks.length} {chunks.length === 1 ? "trecho" : "trechos"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="admin-card__content max-h-[70vh] overflow-y-auto">
              {chunks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum trecho registrado.</p>
              ) : (
                <div className="space-y-3">
                  {chunks.map((chunk, i) => (
                    <div
                      key={chunk.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-slate-500">
                          #{i + 1}
                        </span>
                        {chunk.speaker && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                            {chunk.speaker}
                          </span>
                        )}
                        {(chunk.t_start_seconds !== null || chunk.t_end_seconds !== null) && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(chunk.t_start_seconds)}
                            {chunk.t_end_seconds !== null && ` – ${formatTime(chunk.t_end_seconds)}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna direita: Análise */}
          <Card className="admin-card">
            <CardHeader className="admin-card__header">
              <CardTitle className="admin-card__title">Análise clínica</CardTitle>
            </CardHeader>
            <CardContent className="admin-card__content max-h-[70vh] overflow-y-auto">
              {insights ? (
                <InsightCards pkg={insights} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma análise completa foi gerada neste atendimento.
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
