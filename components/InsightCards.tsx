"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Evidence = { chunk_id?: string; material_id?: string; quote: string };
type Theme = { title: string; description: string; evidence: Evidence[] };
type Question = { question: string; rationale: string; evidence: Evidence[] };
type Hypothesis = {
  hypothesis: string;
  confidence: "low" | "med" | "high";
  evidence: Evidence[];
};
type Risk = {
  type: string;
  note: string;
  urgency: "low" | "med" | "high";
  evidence: Evidence[];
};

type QuestionGroup = {
  evidence: Evidence[];
  questions: Question[];
};

type ThemeGroup = {
  evidence: Evidence[];
  themes: Theme[];
};

type HypothesisGroup = {
  evidence: Evidence[];
  hypotheses: Hypothesis[];
};

type RiskGroup = {
  evidence: Evidence[];
  risks: Risk[];
};

function evidenceKey(evidence: Evidence[]): string {
  return evidence
    .map((e) => `${e.chunk_id ?? ""}|${e.material_id ?? ""}|${e.quote}`)
    .join("||");
}

export type InsightsPackage = {
  themes: Theme[];
  questions: Question[];
  hypotheses: Hypothesis[];
  risks: Risk[];
  summary: { bullets: string[] };
  next_steps: Array<{ step: string; rationale: string }>;
};

function confidenceLabel(v: Hypothesis["confidence"]) {
  if (v === "low") return "baixa";
  if (v === "high") return "alta";
  return "média";
}

function urgencyLabel(v: Risk["urgency"]) {
  if (v === "low") return "baixa";
  if (v === "high") return "alta";
  return "média";
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="mt-2 space-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
      {evidence.map((e, idx) => (
        <div key={`${e.chunk_id}-${idx}`} className="text-xs text-emerald-900">
          <span className="font-semibold text-emerald-800">
            [{e.chunk_id ? `trecho:${e.chunk_id}` : e.material_id ? `material:${e.material_id}` : "evidência"}]
          </span>{" "}
          “{e.quote}”
        </div>
      ))}
    </div>
  );
}

export function InsightCards({ pkg }: { pkg: InsightsPackage | null }) {
  if (!pkg) return null;

  const questionsPerPage = 3;
  const [questionsPage, setQuestionsPage] = useState(1);

  const questionGroups = useMemo(() => {
    const groups = new Map<string, QuestionGroup>();
    for (const q of pkg.questions) {
      const key = evidenceKey(q.evidence);
      const existing = groups.get(key);
      if (existing) {
        existing.questions.push(q);
      } else {
        groups.set(key, { evidence: q.evidence, questions: [q] });
      }
    }
    return Array.from(groups.values());
  }, [pkg.questions]);

  const themeGroups = useMemo(() => {
    const groups = new Map<string, ThemeGroup>();
    for (const t of pkg.themes) {
      const key = evidenceKey(t.evidence);
      const existing = groups.get(key);
      if (existing) {
        existing.themes.push(t);
      } else {
        groups.set(key, { evidence: t.evidence, themes: [t] });
      }
    }
    return Array.from(groups.values());
  }, [pkg.themes]);

  const hypothesisGroups = useMemo(() => {
    const groups = new Map<string, HypothesisGroup>();
    for (const h of pkg.hypotheses) {
      const key = evidenceKey(h.evidence);
      const existing = groups.get(key);
      if (existing) {
        existing.hypotheses.push(h);
      } else {
        groups.set(key, { evidence: h.evidence, hypotheses: [h] });
      }
    }
    return Array.from(groups.values());
  }, [pkg.hypotheses]);

  const riskGroups = useMemo(() => {
    const groups = new Map<string, RiskGroup>();
    for (const r of pkg.risks) {
      const key = evidenceKey(r.evidence);
      const existing = groups.get(key);
      if (existing) {
        existing.risks.push(r);
      } else {
        groups.set(key, { evidence: r.evidence, risks: [r] });
      }
    }
    return Array.from(groups.values());
  }, [pkg.risks]);

  const questionsTotalPages = Math.max(
    1,
    Math.ceil(questionGroups.length / questionsPerPage),
  );

  useEffect(() => {
    setQuestionsPage(1);
  }, [questionGroups.length]);

  const pagedQuestionGroups = useMemo(() => {
    const start = (questionsPage - 1) * questionsPerPage;
    return questionGroups.slice(start, start + questionsPerPage);
  }, [questionGroups, questionsPage]);

  return (
    <Tabs defaultValue="summary" className="flex h-full flex-col">
      <TabsList className="flex w-full flex-wrap justify-start gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-700">
        <TabsTrigger value="themes">Temas</TabsTrigger>
        <TabsTrigger value="questions">Perguntas</TabsTrigger>
        <TabsTrigger value="hypotheses">Hipóteses</TabsTrigger>
        <TabsTrigger value="risks">Riscos</TabsTrigger>
        <TabsTrigger value="summary">Resumo</TabsTrigger>
        <TabsTrigger value="next_steps">Próximos passos</TabsTrigger>
      </TabsList>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <TabsContent value="summary" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {pkg.summary.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="mt-0">
          {pkg.themes.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Sem temas.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {themeGroups.map((group, i) => (
                <Card key={`theme-group-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Temas relacionados</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <EvidenceList evidence={group.evidence} />
                    <div className="space-y-2">
                      {group.themes.map((t, idx) => (
                        <div key={`${t.title}-${idx}`}>
                          <div className="text-sm font-semibold text-foreground">{t.title}</div>
                          <div className="text-sm text-muted-foreground">{t.description}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="mt-0">
          {pkg.questions.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Sem perguntas.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pagedQuestionGroups.map((group, i) => (
                <Card key={`question-group-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Perguntas relacionadas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <EvidenceList evidence={group.evidence} />
                    <div className="space-y-2">
                      {group.questions.map((q, idx) => (
                        <div key={`${q.question}-${idx}`}>
                          <div className="text-sm font-semibold text-foreground">
                            {q.question}
                          </div>
                          <div className="text-sm text-muted-foreground">{q.rationale}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questionsTotalPages > 1 ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs text-muted-foreground">
                  <div>
                    Pagina {questionsPage} de {questionsTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionsPage((prev) => Math.max(1, prev - 1))}
                      disabled={questionsPage === 1}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionsPage((prev) => Math.min(questionsTotalPages, prev + 1))}
                      disabled={questionsPage >= questionsTotalPages}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                    >
                      Proxima
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hypotheses" className="mt-0">
          {pkg.hypotheses.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Sem hipóteses.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hypothesisGroups.map((group, i) => (
                <Card key={`hypothesis-group-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Hipóteses relacionadas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <EvidenceList evidence={group.evidence} />
                    <div className="space-y-2">
                      {group.hypotheses.map((h, idx) => (
                        <div key={`${h.hypothesis}-${idx}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-foreground">
                              {h.hypothesis}
                            </div>
                            <div className="text-xs text-muted-foreground/80">
                              confiança: {confidenceLabel(h.confidence)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risks" className="mt-0">
          {pkg.risks.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Sem riscos.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {riskGroups.map((group, i) => (
                <Card key={`risk-group-${i}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Riscos relacionados</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <EvidenceList evidence={group.evidence} />
                    <div className="space-y-2">
                      {group.risks.map((r, idx) => (
                        <div key={`${r.type}-${idx}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-foreground">{r.type}</div>
                            <div className="text-xs text-muted-foreground/80">
                              urgência: {urgencyLabel(r.urgency)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{r.note}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="next_steps" className="mt-0">
          {pkg.next_steps.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Sem próximos passos.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pkg.next_steps.map((s, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{s.step}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-foreground">{s.rationale}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
