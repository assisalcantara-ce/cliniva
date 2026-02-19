"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { InsightCards, type InsightsPackage } from "@/components/InsightCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Chunk = {
  id: string;
  session_id: string;
  text: string;
  speaker: string | null;
  t_start_seconds: number | null;
  t_end_seconds: number | null;
  created_at?: string;
};

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionId = use(params).id;
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [insights, setInsights] = useState<InsightsPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadInsights = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/insights`, { cache: "no-store" });
    const json = (await res.json()) as
      | { insights: Array<{ kind: string; content_json: unknown }> }
      | { error: string };
    if (!res.ok) return;
    if (!("insights" in json)) return;

    function isRecord(v: unknown): v is Record<string, unknown> {
      return typeof v === "object" && v !== null;
    }

    const pkg: Partial<InsightsPackage> = {};
    for (const row of json.insights) {
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

    if (pkg.themes && pkg.questions && pkg.hypotheses && pkg.risks && pkg.summary && pkg.next_steps) {
      setInsights(pkg as InsightsPackage);
    }
  }, [sessionId]);

  const loadChunks = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}/transcript`, { cache: "no-store" });
    const json = (await res.json()) as { chunks: Chunk[] } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar transcrição");
      return;
    }
    if ("chunks" in json) setChunks(json.chunks);
  }, [sessionId]);

  useEffect(() => {
    void loadChunks();
    void loadInsights();
  }, [loadChunks, loadInsights]);

  async function generateInsights() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/insights/generate`, { method: "POST" });
      const json = (await res.json()) as
        | { package: InsightsPackage }
        | { error: string; detail?: string };
      if (!res.ok) {
        const isDev = process.env.NODE_ENV !== "production";
        const base = "error" in json ? json.error : "Falha ao gerar IA";
        const detail = isDev && "detail" in json && json.detail ? ` (${json.detail})` : "";
        setError(base + detail);
        return;
      }
      if ("package" in json) setInsights(json.package);
      await loadInsights();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar IA");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveChunk(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { text };
      if (speaker.trim().length) payload.speaker = speaker;
      if (tStart.trim().length) payload.t_start_seconds = Number(tStart);
      if (tEnd.trim().length) payload.t_end_seconds = Number(tEnd);

      const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { chunk: Chunk } | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao salvar trecho");
        return;
      }

      setText("");
      setSpeaker("");
      setTStart("");
      setTEnd("");
      await loadChunks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar trecho");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground/80">ID: {sessionId}</div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/patients">Pacientes</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={generateInsights} disabled={isGenerating}>
          {isGenerating ? "Gerando..." : "Gerar suporte (IA)"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void loadInsights()}>
          Recarregar suporte
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transcrição</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveChunk} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Texto</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
                    rows={6}
                    placeholder="Cole ou digite um trecho da sessão..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Falante (opcional)</label>
                    <Input
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      className="mt-1"
                      placeholder="terapeuta | paciente"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Início (s)</label>
                    <Input
                      value={tStart}
                      onChange={(e) => setTStart(e.target.value)}
                      className="mt-1"
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Fim (s)</label>
                    <Input
                      value={tEnd}
                      onChange={(e) => setTEnd(e.target.value)}
                      className="mt-1"
                      placeholder="15"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar trecho"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trechos da transcrição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-md border border-border bg-card">
                {chunks.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Sem trechos ainda.</div>
                ) : (
                  chunks.map((c) => (
                    <div key={c.id} className="p-4">
                      <div className="text-xs text-muted-foreground/80">
                        {c.speaker ? `falante: ${c.speaker} · ` : ""}
                        {c.t_start_seconds != null ? `início: ${c.t_start_seconds} · ` : ""}
                        {c.t_end_seconds != null ? `fim: ${c.t_end_seconds}` : ""}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">{c.text}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suporte (IA)</CardTitle>
          </CardHeader>
          <CardContent>
            {insights ? (
              <InsightCards pkg={insights} />
            ) : (
              <div className="rounded-md border border-border bg-primary/5 p-4 text-sm text-muted-foreground">
                Nenhum suporte ainda. Clique em “Gerar suporte (IA)”.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
