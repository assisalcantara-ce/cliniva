"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { InsightCards, QuickInsightView, type InsightsPackage, type QuickInsightsPackage } from "@/components/InsightCards";
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

// ── Utils ─────────────────────────────────────────────────────────────────────

function compareThemes(
  prev: string[],
  curr: string[],
): { newThemes: string[]; repeatedThemes: string[] } {
  const prevNorm = prev.map((t) => t.toLowerCase().trim());
  return {
    newThemes: curr.filter((t) => !prevNorm.includes(t.toLowerCase().trim())),
    repeatedThemes: curr.filter((t) => prevNorm.includes(t.toLowerCase().trim())),
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Atualizado agora";
  if (diff < 300) return "Atualizado há poucos instantes";
  return "Atualizado recentemente";
}

function InsightPanelHeader({
  status,
  chunkCount,
  lastAnalysisAt,
  isFirstAnalysis,
  themesDelta,
}: {
  status: "idle" | "loading" | "quick" | "full";
  chunkCount: number;
  lastAnalysisAt: Date | null;
  isFirstAnalysis?: boolean;
  themesDelta?: { newThemes: string[]; repeatedThemes: string[] } | null;
}) {
  const quickLabel =
    isFirstAnalysis
      ? "Primeira análise da sessão"
      : "Análise rápida atualizada";

  const configs = {
    idle: { label: "Aguardando trechos da sessão", dot: "", textColor: "text-muted-foreground" },
    loading: { label: "IA organizando o contexto...", dot: "bg-teal-500 animate-pulse", textColor: "text-teal-600" },
    quick: { label: quickLabel, dot: "bg-teal-500", textColor: "text-teal-700" },
    full: { label: "Análise completa gerada", dot: "bg-emerald-500", textColor: "text-emerald-700" },
  } as const;
  const cfg = configs[status];

  const hasNewThemes = (themesDelta?.newThemes.length ?? 0) > 0;
  const hasRepeated = (themesDelta?.repeatedThemes.length ?? 0) > 0;

  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-center gap-2">
        {cfg.dot ? (
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        ) : (
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-slate-300" />
        )}
        <span className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</span>
      </div>

      {(chunkCount > 0 || lastAnalysisAt) && (
        <div className="flex items-center gap-2 pl-4">
          {chunkCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Baseado em {chunkCount} {chunkCount === 1 ? "trecho registrado" : "trechos registrados"}
            </span>
          )}
          {lastAnalysisAt && (
            <span className="text-[11px] text-muted-foreground">· {relativeTime(lastAnalysisAt)}</span>
          )}
        </div>
      )}

      {(status === "quick" || status === "full") && themesDelta && (
        <div className="flex items-center gap-2 pl-4">
          {hasNewThemes && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Novos temas
            </span>
          )}
          {hasRepeated && !hasNewThemes && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              Padrões mantidos
            </span>
          )}
          {hasRepeated && hasNewThemes && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              Padrões mantidos + novos
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisLoadingState() {
  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-2">
        <div className="h-2 w-3/4 rounded-full bg-muted animate-pulse" />
        <div className="h-2 w-1/2 rounded-full bg-muted animate-pulse" />
        <div className="h-2 w-2/3 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-14 w-full rounded-lg bg-muted/60 animate-pulse" />
      <div className="space-y-2">
        <div className="h-2 w-4/5 rounded-full bg-muted animate-pulse" />
        <div className="h-2 w-3/5 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionId = use(params).id;
  const router = useRouter();
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
  const [isFullAI, setIsFullAI] = useState<boolean | null>(null);
  const [insightsMode, setInsightsMode] = useState<"quick" | "full" | null>(null);
  const [quickInsights, setQuickInsights] = useState<QuickInsightsPackage | null>(null);
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false);
  const quickDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(null);
  const [quickAnalysisCount, setQuickAnalysisCount] = useState(0);
  const [themesDelta, setThemesDelta] = useState<{ newThemes: string[]; repeatedThemes: string[] } | null>(null);
  const prevQuickThemeTitlesRef = useRef<string[] | null>(null);
  const [priorQuickThemesForFull, setPriorQuickThemesForFull] = useState<string[] | null>(null);
  const [sessionPatientMemory, setSessionPatientMemory] = useState<string | null>(null);
  const [aiHasKey, setAiHasKey] = useState(false);
  const [deletingChunkId, setDeletingChunkId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  // Quantidade de chunks no momento da última análise completa
  const [chunksAtLastFullAnalysis, setChunksAtLastFullAnalysis] = useState<number | null>(null);
  const [isEncerando, setIsEncerando] = useState(false);
  const chunksPerPage = 1;
  const totalPages = Math.max(1, Math.ceil(chunks.length / chunksPerPage));
  const pageChunks = chunks.slice((chunksPage - 1) * chunksPerPage, chunksPage * chunksPerPage);

  const loadInsights = useCallback(async (): Promise<boolean> => {
    const res = await fetch(`/api/sessions/${sessionId}/insights`, { cache: "no-store" });
    const json = (await res.json()) as
      | { insights: Array<{ kind: string; content_json: unknown }>; patientMemory?: string | null }
      | { error: string };
    if (!res.ok) return false;
    if (!("insights" in json)) return false;

    // Restaura memória clínica do paciente (container roxo) após refresh
    if (json.patientMemory && typeof json.patientMemory === "string" && json.patientMemory.trim()) {
      setSessionPatientMemory(json.patientMemory);
    }

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
      setInsightsMode("full");
      // Ao carregar do banco: usa -1 como sentinela apenas se ainda não há baseline definido
      setChunksAtLastFullAnalysis((prev) => prev === null ? -1 : prev);
      return true;
    }
    return false;
  }, [sessionId]);

  const loadChunks = useCallback(async (): Promise<number> => {
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}/transcript`, { cache: "no-store" });
    const json = (await res.json()) as { chunks: Chunk[] } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar transcrição");
      return 0;
    }
    if ("chunks" in json) {
      setChunks(json.chunks);
      const nextTotalPages = Math.max(1, Math.ceil(json.chunks.length / chunksPerPage));
      setChunksPage(nextTotalPages);
      // Alinha baseline ao carregar do banco (sentinela -1 → total atual)
      setChunksAtLastFullAnalysis((prev) => prev === -1 ? json.chunks.length : prev);
      return json.chunks.length;
    }
    return 0;
  }, [sessionId, chunksPerPage]);

  useEffect(() => {
    // Sequencial: insights primeiro para definir sentinela -1, depois chunks para alinhar baseline
    // Se não há análise completa mas há trechos → dispara análise rápida automaticamente
    async function init() {
      const hasFullInsights = await loadInsights();
      const chunkCount = await loadChunks();
      if (!hasFullInsights && chunkCount > 0) {
        void triggerQuickInsights();
      }
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadChunks, loadInsights]);

  useEffect(() => {
    async function loadSessionMeta() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
        if (!res.ok) {
          setPatientName(null);
          return;
        }
        const json = (await res.json()) as { patient_name?: string | null };
        setPatientName(typeof json.patient_name === "string" ? json.patient_name : null);
      } catch {
        setPatientName(null);
      }
    }

    void loadSessionMeta();
  }, [sessionId]);

  useEffect(() => {
    async function loadAiStatus() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          setAiHasKey(false);
          return;
        }
        const json = (await res.json()) as { ai?: { has_key?: boolean } };
        setAiHasKey(Boolean(json.ai?.has_key));
      } catch {
        setAiHasKey(false);
      }
    }

    void loadAiStatus();
  }, []);

  async function generateInsights() {
    setIsGenerating(true);
    setError(null);
    try {
      await loadChunks();
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
        // Captura os temas do quick mode atual para seção de continuidade
        const capturedQuickThemes = quickInsights?.themes.map((t) => t.title) ?? null;
        setPriorQuickThemesForFull(capturedQuickThemes);
        setInsights(json.package);
        setLastAnalysisAt(new Date());
        // Persiste memória clínica retornada pela API (estado anterior à sessão atual)
        const mem = (json as { patientMemory?: string | null }).patientMemory;
        if (typeof mem === "string" && mem.trim()) {
          setSessionPatientMemory(mem);
        }
        const fullAI = (json as { isFullAI?: boolean }).isFullAI ?? false;
        setIsFullAI(fullAI);
        setInsightsMode("full");
        setChunksAtLastFullAnalysis(chunks.length);
        setQuickInsights(null); // limpa análise rápida quando full chega
        const fallback = json.fallback;
        if (fallback?.used) {
          const reason = fallback.reason;
          const message =
            reason === "quota"
              ? "Cota da OpenAI esgotada. Insights gerados em modo básico (sem RAG)."
              : reason === "groq_rate_limit"
              ? "Limite temporário do Groq atingido. Configure sua chave OpenAI para continuar."
              : "Sem chave OpenAI. Insights gerados em modo básico (sem RAG)."
          setFallbackNotice(message);
        } else {
          setFallbackNotice(null);
        }
      }
      // Não chamar loadInsights aqui: já temos os dados frescos e chamá-lo
      // resetaria chunksAtLastFullAnalysis, re-habilitando o botão indevidamente.
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
      if (aiHasKey) {
        if (speaker.trim().length) payload.speaker = speaker;
        if (tStart.trim().length) payload.t_start_seconds = Number(tStart);
        if (tEnd.trim().length) payload.t_end_seconds = Number(tEnd);
      }

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

      // Disparar análise rápida com debounce de 800ms
      if (quickDebounceRef.current) clearTimeout(quickDebounceRef.current);
      quickDebounceRef.current = setTimeout(() => {
        void triggerQuickInsights();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar trecho");
    } finally {
      setIsSaving(false);
    }
  }

  function requestDeleteChunk(chunkId: string) {
    setDeleteTargetId(chunkId);
  }

  async function triggerQuickInsights() {
    setIsQuickAnalyzing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/insights/quick`, { method: "POST" });
      if (!res.ok) return; // silencioso
      const json = (await res.json()) as {
        package: QuickInsightsPackage;
        mode: "quick";
      };
      if (json.package) {
      const currTitles = json.package.themes.map((t) => t.title);
      const prevTitles = prevQuickThemeTitlesRef.current;
      if (prevTitles && prevTitles.length > 0 && quickAnalysisCount > 0) {
        setThemesDelta(compareThemes(prevTitles, currTitles));
      } else {
        setThemesDelta(null);
      }
      prevQuickThemeTitlesRef.current = currTitles;
      setQuickInsights(json.package);
        setLastAnalysisAt(new Date());
        // Só marca modo quick se não houver análise completa ativa
        setInsightsMode((prev) => (prev === "full" ? "full" : "quick"));
        setQuickAnalysisCount((c) => c + 1);
      }
    } catch {
      // Falha silenciosa — não quebra UI
    } finally {
      setIsQuickAnalyzing(false);
    }
  }

  function closeDeleteModal() {
    if (deletingChunkId) return;
    setDeleteTargetId(null);
  }

  async function confirmDeleteChunk() {
    if (!deleteTargetId) return;
    const chunkId = deleteTargetId;
    setDeletingChunkId(chunkId);
    setError(null);
    // Verifica se este é o último chunk antes de deletar
    const isLastChunk = chunks.filter((c) => c.id !== chunkId).length === 0;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chunk_id: chunkId }),
      });

      const json = (await res.json()) as { ok?: boolean } | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao excluir trecho");
        return;
      }

      await loadChunks();

      // Se era o último chunk, limpa toda a análise e volta ao estado inicial
      if (isLastChunk) {
        clearInsightsState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir trecho");
    } finally {
      setDeletingChunkId(null);
      setDeleteTargetId(null);
    }
  }

  const aiStatus: "idle" | "loading" | "quick" | "full" =
    isQuickAnalyzing || isGenerating
      ? "loading"
      : insightsMode === "full"
      ? "full"
      : insightsMode === "quick"
      ? "quick"
      : "idle";

  function clearInsightsState() {
    setInsights(null);
    setQuickInsights(null);
    setInsightsMode(null);
    setLastAnalysisAt(null);
    setThemesDelta(null);
    setPriorQuickThemesForFull(null);
    setSessionPatientMemory(null);
    setFallbackNotice(null);
    setIsFullAI(null);
    setQuickAnalysisCount(0);
    setChunksAtLastFullAnalysis(null);
    prevQuickThemeTitlesRef.current = null;
  }

  async function resetAnalysis() {
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/insights`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Falha ao limpar análise");
        return;
      }
      clearInsightsState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao limpar análise");
    }
  }

  async function encerrarAtendimento() {
    // Insights e trechos já estão salvos no banco — apenas navega para a lista
    // Os insights gerados são registro permanente da sessão e não devem ser arquivados aqui
    setIsEncerando(true);
    try {
      router.push("/sessions");
    } finally {
      setIsEncerando(false);
    }
  }

  const hasContent =
    (insightsMode === "full" && !!insights) ||
    (insightsMode === "quick" && !!quickInsights);

  // Botão habilitado apenas se há trechos E (ainda não analisou OU surgiram novos trechos)
  const hasNewChunksSinceFullAnalysis =
    chunksAtLastFullAnalysis === null || chunks.length > chunksAtLastFullAnalysis;
  const canGenerate =
    chunks.length > 0 && hasNewChunksSinceFullAnalysis && !isGenerating && !isSaving;

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
            {patientName ? (
              <div className="text-xs text-muted-foreground/80">Paciente: {patientName}</div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" />
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50 mt-6">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {fallbackNotice ? (
        <Card className="admin-card border-amber-200 bg-amber-50 mt-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900">Análise gerada em modo básico</p>
                <p className="text-xs text-amber-800">{fallbackNotice}</p>
                <p className="text-xs text-amber-700">
                  Para análise avançada com evidências, RAG e materiais clínicos,{" "}
                  <Link href="/settings" className="underline font-medium">configure sua chave OpenAI nas configurações</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isFullAI === false && !fallbackNotice ? (
        <Card className="admin-card border-amber-200 bg-amber-50 mt-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900">Modo básico de IA ativo</p>
                <p className="text-xs text-amber-800">
                  Esta análise foi gerada pelo Groq (gratuito), sem acesso a RAG, embeddings nem evidências de materiais clínicos.
                  Os insights são funcionais, mas menos precisos e contextualizados do que com OpenAI.
                </p>
                <p className="text-xs text-amber-700">
                  <Link href="/settings" className="underline font-medium">Adicione sua chave OpenAI nas configurações</Link>{" "}
                  para liberar análise completa com suporte a materiais e evidências.
                </p>
              </div>
            </div>
          </CardContent>
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
                    rows={9}
                    placeholder="Cole ou digite um trecho da sessão..."
                  />
                </div>

                {aiHasKey ? (
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
                ) : null}

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
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-200">
                {chunks.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">Sem trechos ainda.</div>
                ) : (
                  pageChunks.map((c) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground/80">
                        <div>
                          {c.speaker ? `falante: ${c.speaker} · ` : ""}
                          {c.t_start_seconds != null ? `início: ${c.t_start_seconds} · ` : ""}
                          {c.t_end_seconds != null ? `fim: ${c.t_end_seconds}` : ""}
                        </div>
                        <button
                          type="button"
                          onClick={() => requestDeleteChunk(c.id)}
                          disabled={deletingChunkId === c.id}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                        >
                          {deletingChunkId === c.id ? "Excluindo..." : "Excluir"}
                        </button>
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

        <Card className="admin-card h-full">
          <CardHeader className="admin-card__header">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={generateInsights}
                disabled={!canGenerate}
                title={
                  chunks.length === 0
                    ? "Adicione ao menos um trecho antes de gerar"
                    : !hasNewChunksSinceFullAnalysis
                    ? "Adicione um novo trecho para gerar nova análise"
                    : undefined
                }
                className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Gerando..." : "Gerar análise completa"}
              </Button>

              {insightsMode === "full" && (
                <button
                  type="button"
                  onClick={() => void encerrarAtendimento()}
                  disabled={isGenerating || isEncerando}
                  className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  title="Encerrar atendimento, salvar dados e liberar para novo atendimento"
                >
                  {isEncerando ? "Encerrando..." : "Encerrar Atendimento"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="admin-card__content flex min-h-0 flex-1 flex-col overflow-hidden">
            <InsightPanelHeader
              status={aiStatus}
              chunkCount={chunks.length}
              lastAnalysisAt={lastAnalysisAt}
              isFirstAnalysis={quickAnalysisCount <= 1 && insightsMode === "quick"}
              themesDelta={themesDelta}
            />
            {isGenerating ? (
              <AnalysisLoadingState />
            ) : isQuickAnalyzing && !hasContent ? (
              <AnalysisLoadingState />
            ) : insightsMode === "full" && insights ? (
              <>
                <InsightCards pkg={insights} priorThemes={priorQuickThemesForFull} patientMemory={sessionPatientMemory} isBasicMode={isFullAI === false} />
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Análise completa com suporte clínico estruturado.
                </p>
              </>
            ) : insightsMode === "quick" && quickInsights ? (
              <QuickInsightView pkg={quickInsights} onGenerateFull={canGenerate ? generateInsights : undefined} aiHasKey={aiHasKey} />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhum suporte ainda. Salve um trecho para análise automática ou clique em &quot;Gerar análise completa&quot;.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deleteTargetId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-border px-6 py-4">
              <div className="text-sm font-semibold text-foreground">Excluir trecho</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Esta acao nao pode ser desfeita.
              </div>
            </div>
            <div className="px-6 py-5 text-sm text-foreground">
              Deseja excluir este trecho da transcricao?
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingChunkId)}
                className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteChunk()}
                disabled={Boolean(deletingChunkId)}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingChunkId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
