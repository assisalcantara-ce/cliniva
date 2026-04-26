"use client";

import { useState } from "react";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Evidence = { chunk_id?: string; material_id?: string; quote: string };

type Theme = { title: string; description: string; evidence: Evidence[] };
type Question = { question: string; rationale: string; evidence: Evidence[] };
type Hypothesis = { hypothesis: string; confidence: "low" | "med" | "high"; evidence: Evidence[] };
type Risk = { type: string; note: string; urgency: "low" | "med" | "high"; evidence: Evidence[] };

export type InsightsPackage = {
  themes: Theme[];
  questions: Question[];
  hypotheses: Hypothesis[];
  risks: Risk[];
  summary: { bullets: string[] };
  next_steps: Array<{ step: string; rationale: string }>;
  suggested_next_steps?: Array<{
    action: string;
    rationale: string;
    type: "exploration" | "intervention" | "monitoring";
  }>;
};

export type QuickInsightsPackage = {
  summary: string;
  themes: Array<{ title: string; description: string }>;
  questions?: Array<{ question: string; rationale: string }>;
  hypotheses?: Array<{ hypothesis: string; confidence: string }>;
  next_steps?: Array<{ step: string; rationale: string }>;
};

// â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EvidenceItem({ evidence }: { evidence: Evidence[] }) {
  if (!evidence.length) return null;
  return (
    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-1">
      {evidence.map((e, i) => (
        <div key={i} className="text-xs text-emerald-900">
          <span className="font-semibold text-emerald-800">
            [{e.chunk_id ? `trecho:${e.chunk_id}` : e.material_id ? `material:${e.material_id}` : "evidência"}]
          </span>{" "}
          &ldquo;{e.quote}&rdquo;
        </div>
      ))}
    </div>
  );
}

// â”€â”€ Reusable sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SummaryBlock({ bullets }: { bullets: string[] }) {
  const visible = bullets.slice(0, 3);
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-5 py-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-3">
        Resumo
      </div>
      <ul className="space-y-2">
        {visible.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HypothesisBlock({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const visible = hypotheses.slice(0, 3);
  if (!visible.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Hipóteses Clínicas
      </div>
      {visible.map((h, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              Hipótese assistiva
            </span>
            <span className="text-[10px] text-muted-foreground">
              confiança:{" "}
              {h.confidence === "low" ? "baixa" : h.confidence === "high" ? "alta" : "média"}
            </span>
          </div>
          <p className="mt-2 text-sm text-foreground">{h.hypothesis}</p>
          {h.evidence.length > 0 && <EvidenceItem evidence={h.evidence.slice(0, 1)} />}
        </div>
      ))}
    </div>
  );
}

export function QuestionsBlock({ questions }: { questions: Question[] }) {
  const visible = questions.slice(0, 3);
  if (!visible.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Perguntas Sugeridas
      </div>
      {visible.map((q, i) => (
        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{q.question}</p>
          {q.rationale && (
            <p className="mt-0.5 text-xs text-muted-foreground">{q.rationale}</p>
          )}
        </div>
      ))}
    </div>
  );
}

type SuggestedStep = { action: string; rationale: string; type: "exploration" | "intervention" | "monitoring" };

const STEP_TYPE_CONFIG: Record<SuggestedStep["type"], { label: string; classes: string }> = {
  exploration: {
    label: "exploração",
    classes: "border-blue-200 bg-blue-50 text-blue-700",
  },
  intervention: {
    label: "intervenção",
    classes: "border-violet-200 bg-violet-50 text-violet-700",
  },
  monitoring: {
    label: "monitoramento",
    classes: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function SuggestedNextStepsBlock({ steps }: { steps: SuggestedStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Próximos Passos Sugeridos
        </div>
        <span className="text-[10px] text-muted-foreground">para a próxima sessão</span>
      </div>
      {steps.map((s, i) => {
        const cfg = STEP_TYPE_CONFIG[s.type] ?? STEP_TYPE_CONFIG.exploration;
        return (
          <div
            key={i}
            className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground leading-snug">{s.action}</p>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.classes}`}
              >
                {cfg.label}
              </span>
            </div>
            {s.rationale && (
              <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  highlight = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-lg border ${
        highlight ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            highlight ? "text-red-700" : "text-slate-500"
          }`}
        >
          {title}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
            highlight ? "text-red-400" : "text-slate-400"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-inherit px-4 py-3">{children}</div>
      )}
    </div>
  );
}

// â”€â”€ QuickInsightView (modo rÃ¡pido) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ── QuickInsightView helpers ─────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AdvancedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
      <LockIcon />
      Recurso avançado
    </span>
  );
}

function deriveTeaser(themes: Array<{ title: string }>) {
  const first = themes[0]?.title ?? null;
  const label = first ? first.toLowerCase() : "os temas identificados";
  return {
    question: `Explorar mais sobre o impacto de ${label} na dinâmica atual...`,
    hypothesis: `Pode indicar padrões emocionais relacionados a ${label}...`,
    nextStep: `Considerar aprofundar ${label} na próxima sessão`,
  };
}

// ── QuickInsightView (modo rápido) ────────────────────────────────────────────

export function QuickInsightView({
  pkg,
  onGenerateFull,
  aiHasKey,
}: {
  pkg: QuickInsightsPackage;
  onGenerateFull?: () => void;
  aiHasKey?: boolean;
}) {
  const locked = !aiHasKey;
  const teaser = deriveTeaser(pkg.themes);

  const questions = pkg.questions ?? [];
  const hypotheses = pkg.hypotheses ?? [];
  const nextSteps = pkg.next_steps ?? [];

  return (
    <div className="space-y-4 text-sm overflow-y-auto pr-1">
      <p className="text-xs text-muted-foreground">
        Insights gerados a partir dos trechos registrados nesta sessão.
      </p>

      {/* Resumo */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-5 py-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-2">
          Resumo
        </div>
        <p className="text-sm text-foreground">{pkg.summary}</p>
      </div>

      {/* Temas */}
      {pkg.themes.length > 0 && (
        <CollapsibleSection title="Temas Identificados" defaultOpen>
          <div className="space-y-3">
            {pkg.themes.map((t, i) => (
              <div key={i}>
                <div className="font-medium text-foreground text-sm">{t.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Recursos (reais quando desbloqueado, teaser quando sem chave) ── */}
      {locked ? (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Também disponível na análise completa
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="space-y-2 opacity-70">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Perguntas Sugeridas</span>
                <AdvancedBadge />
              </div>
              <p className="text-sm text-slate-600 blur-[1.5px] select-none">• {teaser.question}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Hipótese assistiva</span>
                <AdvancedBadge />
              </div>
              <p className="text-sm text-violet-900/60 blur-[1.5px] select-none">• {teaser.hypothesis}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Próximos Passos</span>
                <AdvancedBadge />
              </div>
              <p className="text-sm text-blue-900/60 blur-[1.5px] select-none">• {teaser.nextStep}</p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-[12px] text-amber-800 font-medium mb-1">Análise completa indisponível</p>
            <p className="text-[11px] text-amber-700">
              Configure sua chave OpenAI nas{" "}
              <a href="/settings" className="underline font-medium">configurações</a>{" "}
              para gerar hipóteses, perguntas e próximos passos com evidência.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* Perguntas sugeridas */}
          {questions.length > 0 && (
            <CollapsibleSection title="Perguntas Sugeridas">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    {q.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{q.rationale}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Hipóteses */}
          {hypotheses.length > 0 && (
            <CollapsibleSection title="Hipóteses Assistivas">
              <div className="space-y-2">
                {hypotheses.map((h, i) => (
                  <div key={i} className="rounded-lg border border-violet-100 bg-violet-50/40 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        Hipótese assistiva
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        confiança:{" "}
                        {h.confidence === "low" ? "baixa" : h.confidence === "high" ? "alta" : "média"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{h.hypothesis}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Próximos passos */}
          {nextSteps.length > 0 && (
            <CollapsibleSection title="Próximos Passos">
              <div className="space-y-2">
                {nextSteps.map((s, i) => (
                  <div key={i} className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{s.step}</p>
                    {s.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{s.rationale}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€ InsightCards (modo completo) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Se o texto for JSON, extrai os valores de string de forma legível */
function sanitizePatientMemory(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    function extractStrings(v: unknown): string[] {
      if (typeof v === "string") return [v.trim()].filter(Boolean);
      if (Array.isArray(v)) return v.flatMap((item) => extractStrings(item));
      if (typeof v === "object" && v !== null) {
        return Object.values(v as Record<string, unknown>).flatMap((val) => extractStrings(val));
      }
      return [];
    }
    const lines = extractStrings(parsed);
    return lines.join("\n") || trimmed;
  } catch {
    return trimmed;
  }
}

export function InsightCards({
  pkg,
  priorThemes,
  patientMemory,
  isBasicMode,
}: {
  pkg: InsightsPackage | null;
  priorThemes?: string[] | null;
  patientMemory?: string | null;
  isBasicMode?: boolean;
}) {
  if (!pkg) return null;

  const hasRisks = pkg.risks.length > 0;
  const hasHighRisk = pkg.risks.some((r) => r.urgency === "high");

  // Seção de continuidade: temas do full que também apareceram no quick anterior
  const priorNorm = (priorThemes ?? []).map((t) => t.toLowerCase().trim());
  const recurrentThemes = priorNorm.length > 0
    ? pkg.themes.filter((t) => priorNorm.includes(t.title.toLowerCase().trim()))
    : [];
  const newFullThemes = priorNorm.length > 0
    ? pkg.themes.filter((t) => !priorNorm.includes(t.title.toLowerCase().trim()))
    : [];
  const showContinuidade = priorNorm.length > 0 && pkg.themes.length > 0;

  return (
    <div className="space-y-4 text-sm overflow-y-auto pr-1">
      {/* Microcopy */}
      <p className="text-xs text-muted-foreground">
        Insights gerados a partir dos trechos registrados nesta sessão.
      </p>

      {/* Aviso modo básico (Groq sem RAG) */}
      {isBasicMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Análise gerada em <strong>modo básico</strong> (sem RAG nem evidências de materiais).{" "}
          <a href="/settings" className="underline font-medium">Configure sua chave OpenAI</a>{" "}
          para uma análise mais avançada.
        </div>
      )}

      {/* Contexto do Paciente (memória de sessões anteriores) */}
      {patientMemory && patientMemory.trim().length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-violet-700">
              Contexto do Paciente
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              Baseado em sessões anteriores
            </span>
          </div>
          <p className="text-xs text-violet-900 leading-relaxed whitespace-pre-line">
            {sanitizePatientMemory(patientMemory)}
          </p>
        </div>
      )}

      {/* 1. Resumo */}
      <SummaryBlock bullets={pkg.summary.bullets} />

      {/* 2. Hipóteses clínicas */}
      <HypothesisBlock hypotheses={pkg.hypotheses} />

      {/* 3. Perguntas sugeridas */}
      <QuestionsBlock questions={pkg.questions} />

      {/* 4. Próximos passos sugeridos para a próxima sessão */}
      {pkg.suggested_next_steps && pkg.suggested_next_steps.length > 0 && (
        <SuggestedNextStepsBlock steps={pkg.suggested_next_steps} />
      )}

      {/* 5. Temas identificados (colapsável) */}
      {pkg.themes.length > 0 && (
        <CollapsibleSection title="Temas Identificados">
          <div className="space-y-3">
            {pkg.themes.map((t, i) => (
              <div key={i}>
                <div className="font-medium text-foreground text-sm">{t.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
                {t.evidence.length > 0 && (
                  <EvidenceItem evidence={t.evidence.slice(0, 1)} />
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* 6. Riscos (colapsável, só se houver) */}
      {hasRisks && (
        <CollapsibleSection
          title="Pontos de Atenção"
          highlight={hasHighRisk}
          defaultOpen={hasHighRisk}
        >
          <div className="space-y-3">
            {pkg.risks.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm text-foreground">{r.type}</div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      r.urgency === "high"
                        ? "border-red-300 bg-red-100 text-red-800"
                        : r.urgency === "med"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {r.urgency === "high"
                      ? "urgente"
                      : r.urgency === "med"
                      ? "moderado"
                      : "baixo"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.note}</div>
                {r.evidence.length > 0 && (
                  <EvidenceItem evidence={r.evidence.slice(0, 1)} />
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Próximos passos (colapsável) */}
      {pkg.next_steps.length > 0 && (
        <CollapsibleSection title="Próximos Passos">
          <div className="space-y-2">
            {pkg.next_steps.map((s, i) => (
              <div key={i}>
                <div className="font-medium text-sm text-foreground">{s.step}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.rationale}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Continuidade da sessão (só quando há histórico do quick mode) */}
      {showContinuidade && (
        <CollapsibleSection title="Continuidade da Sessão">
          <div className="space-y-4">
            {recurrentThemes.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Padrões recorrentes
                  </span>
                </div>
                <div className="space-y-2">
                  {recurrentThemes.map((t, i) => (
                    <div key={i}>
                      <div className="font-medium text-foreground text-sm">{t.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {newFullThemes.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Novos aspectos aprofundados
                  </span>
                </div>
                <div className="space-y-2">
                  {newFullThemes.map((t, i) => (
                    <div key={i}>
                      <div className="font-medium text-foreground text-sm">{t.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
