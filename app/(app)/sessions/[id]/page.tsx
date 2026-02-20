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
  const [chunksPage, setChunksPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const chunksPerPage = 1;
  const totalPages = Math.max(1, Math.ceil(chunks.length / chunksPerPage));
  const pageChunks = chunks.slice((chunksPage - 1) * chunksPerPage, chunksPage * chunksPerPage);

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
    if ("chunks" in json) {
      setChunks(json.chunks);
      setChunksPage(1);
    }
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
        | { package: InsightsPackage; fallback?: { used: boolean; reason?: string } }
        | { error: string; detail?: string };
      if (!res.ok) {
        const isDev = process.env.NODE_ENV !== "production";
        const base = "error" in json ? json.error : "Falha ao gerar IA";
        const detail = isDev && "detail" in json && json.detail ? ` (${json.detail})` : "";
        setError(base + detail);
        return;
      }
      if ("package" in json) {
        setInsights(json.package);
        const fallback = json.fallback;
        if (fallback?.used) {
          const reason = fallback.reason;
          const message =
            reason === "quota"
              ? "Sem credito na OpenAI. A IA gratuita foi usada nesta geracao."
              : "Sem chave valida. A IA gratuita foi usada nesta geracao.";
          setFallbackNotice(message);
        } else {
          setFallbackNotice(null);
        }
      }
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
      setChunksPage(1);
      await loadChunks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar trecho");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="patients-page space-y-0">
      <div className="page-header">
        <div className="title-row">
          <svg
            className="title-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: "40px", height: "40px" }}
          >
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#0f766e" strokeWidth="2" />
            <path d="M7 8h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 12h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 16h6" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="page-title" style={{ fontSize: "32px" }}>
              Atendimento
            </h1>
            <div className="text-xs text-muted-foreground/80">ID: {sessionId}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/patients">Pacientes</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={generateInsights}
          disabled={isGenerating}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {isGenerating ? "Gerando..." : "Gerar suporte (IA)"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void loadInsights()}>
          Recarregar suporte
        </Button>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50 mt-6">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {fallbackNotice ? (
        <Card className="admin-card border-amber-200 bg-amber-50 mt-6">
          <CardContent className="p-5 text-sm text-amber-900">{fallbackNotice}</CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="admin-card">
            <CardHeader className="admin-card__header">
              <CardTitle className="admin-card__title">Transcrição</CardTitle>
            </CardHeader>
            <CardContent className="admin-card__content">
              <form onSubmit={saveChunk} className="space-y-3">
                <div className="field">
                  <label className="label">Texto</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background control"
                    rows={6}
                    placeholder="Cole ou digite um trecho da sessão..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="field">
                    <label className="label">Falante (opcional)</label>
                    <Input
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      className="control"
                      placeholder="terapeuta | paciente"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Início (s)</label>
                    <Input
                      value={tStart}
                      onChange={(e) => setTStart(e.target.value)}
                      className="control"
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Fim (s)</label>
                    <Input
                      value={tEnd}
                      onChange={(e) => setTEnd(e.target.value)}
                      className="control"
                      placeholder="15"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {isSaving ? "Salvando..." : "Salvar trecho"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardHeader className="admin-card__header">
              <CardTitle className="admin-card__title">Trechos da transcrição</CardTitle>
            </CardHeader>
            <CardContent className="admin-card__content p-0">
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-200">
                {chunks.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">Sem trechos ainda.</div>
                ) : (
                  pageChunks.map((c) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="text-xs text-muted-foreground/80">
                        {c.speaker ? `falante: ${c.speaker} · ` : ""}
                        {c.t_start_seconds != null ? `início: ${c.t_start_seconds} · ` : ""}
                        {c.t_end_seconds != null ? `fim: ${c.t_end_seconds}` : ""}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {c.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
                <div>
                  Pagina {chunksPage} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChunksPage((prev) => Math.max(1, prev - 1))}
                    disabled={chunksPage === 1}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setChunksPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={chunksPage >= totalPages}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                  >
                    Proxima
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Suporte (IA)</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            {insights ? (
              <InsightCards pkg={insights} />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhum suporte ainda. Clique em "Gerar suporte (IA)".
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
