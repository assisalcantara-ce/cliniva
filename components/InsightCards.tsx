"use client";

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
    <div className="mt-2 space-y-1">
      {evidence.map((e, idx) => (
        <div key={`${e.chunk_id}-${idx}`} className="text-xs text-muted-foreground">
          <span className="font-medium">
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

  return (
    <Tabs defaultValue="summary">
      <TabsList className="flex w-full flex-wrap justify-start gap-1 border-emerald-200 bg-emerald-50/70 text-emerald-700">
        <TabsTrigger value="themes">Temas</TabsTrigger>
        <TabsTrigger value="questions">Perguntas</TabsTrigger>
        <TabsTrigger value="hypotheses">Hipóteses</TabsTrigger>
        <TabsTrigger value="risks">Riscos</TabsTrigger>
        <TabsTrigger value="summary">Resumo</TabsTrigger>
        <TabsTrigger value="next_steps">Próximos passos</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
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

      <TabsContent value="themes">
        {pkg.themes.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">Sem temas.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pkg.themes.map((t, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-foreground">{t.description}</div>
                  <EvidenceList evidence={t.evidence} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="questions">
        {pkg.questions.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">Sem perguntas.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pkg.questions.map((q, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{q.question}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-foreground">{q.rationale}</div>
                  <EvidenceList evidence={q.evidence} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="hypotheses">
        {pkg.hypotheses.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">Sem hipóteses.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pkg.hypotheses.map((h, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{h.hypothesis}</CardTitle>
                    <div className="text-xs text-muted-foreground/80">
                      confiança: {confidenceLabel(h.confidence)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <EvidenceList evidence={h.evidence} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="risks">
        {pkg.risks.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">Sem riscos.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pkg.risks.map((r, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{r.type}</CardTitle>
                    <div className="text-xs text-muted-foreground/80">
                      urgência: {urgencyLabel(r.urgency)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-foreground">{r.note}</div>
                  <EvidenceList evidence={r.evidence} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="next_steps">
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
    </Tabs>
  );
}
