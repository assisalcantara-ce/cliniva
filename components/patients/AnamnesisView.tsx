import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AnamnesisViewProps {
  anamnesis: Record<string, unknown> | null;
  className?: string;
  onEditAnamnesis?: () => void;
}

interface PersonalData {
  age?: string;
  birth_date?: string;
  marital_status?: string;
  cpf?: string;
  email?: string;
  celular?: string;
  profession?: string;
  education?: string;
  living_with?: string;
  has_children?: string;
  children_count?: string;
  children_ages?: string;
}

interface QuestionAnswer {
  question: string;
  answer?: string;
}

interface AnamnesisGroup {
  id: string;
  title: string;
  answers: QuestionAnswer[];
}

export function AnamnesisView({ anamnesis, className, onEditAnamnesis }: AnamnesisViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  if (!anamnesis) {
    return (
      <Card className={`border-border/80 ${className ?? ""}`}>
        <CardHeader className="p-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-bold text-foreground">
              Anamnese & Histórico de Base
            </CardTitle>
            {onEditAnamnesis && (
              <Button
                type="button"
                size="sm"
                onClick={onEditAnamnesis}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Preencher Anamnese
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <p className="text-xs text-muted-foreground italic">
            Nenhuma ficha de anamnese registrada para este paciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const personal = (anamnesis.personal as PersonalData | undefined) ?? {};
  const rawGroups = Array.isArray(anamnesis.groups) ? anamnesis.groups : [];

  const groups: AnamnesisGroup[] = rawGroups.map((g, idx) => {
    const gObj = typeof g === "object" && g !== null ? (g as Record<string, unknown>) : {};
    const id = typeof gObj.id === "string" ? gObj.id : `group-${idx}`;
    const title = typeof gObj.title === "string" ? gObj.title : `Grupo ${idx + 1}`;
    const answers: QuestionAnswer[] = Array.isArray(gObj.answers)
      ? gObj.answers.map((a) => {
          const aObj = typeof a === "object" && a !== null ? (a as Record<string, unknown>) : {};
          return {
            question: typeof aObj.question === "string" ? aObj.question : "",
            answer: typeof aObj.answer === "string" ? aObj.answer : undefined,
          };
        }).filter((a) => a.question.trim().length > 0)
      : [];

    return { id, title, answers };
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleAll = () => {
    const nextState = !isAllExpanded;
    setIsAllExpanded(nextState);
    const newExpanded: Record<string, boolean> = {};
    for (const g of groups) {
      newExpanded[g.id] = nextState;
    }
    setExpandedGroups(newExpanded);
  };

  const hasPersonalData = Object.values(personal).some((v) => typeof v === "string" && v.trim().length > 0);

  return (
    <Card className={`border-border/80 bg-card shadow-xs ${className ?? ""}`}>
      <CardHeader className="border-b border-border/70 p-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <CardTitle className="text-base font-bold text-foreground">
              Anamnese & Histórico Clínico de Base
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {groups.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                {isAllExpanded ? "Recolher todos" : "Expandir todos"}
              </Button>
            )}
            {onEditAnamnesis && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onEditAnamnesis}
                className="text-xs font-semibold border-teal-600/40 text-teal-700 hover:bg-teal-50"
              >
                Editar Anamnese
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Dados Pessoais / Identificação Básica */}
        {hasPersonalData && (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Perfil e Contexto Pessoal
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 md:grid-cols-4">
              {personal.age && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Idade</span>
                  <span className="font-medium text-foreground">{personal.age} anos</span>
                </div>
              )}
              {personal.marital_status && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Estado Civil</span>
                  <span className="font-medium text-foreground">{personal.marital_status}</span>
                </div>
              )}
              {personal.profession && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Profissão</span>
                  <span className="font-medium text-foreground">{personal.profession}</span>
                </div>
              )}
              {personal.education && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Escolaridade</span>
                  <span className="font-medium text-foreground">{personal.education}</span>
                </div>
              )}
              {personal.living_with && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Mora com</span>
                  <span className="font-medium text-foreground">{personal.living_with}</span>
                </div>
              )}
              {personal.has_children && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Filhos</span>
                  <span className="font-medium text-foreground">
                    {personal.has_children === "sim" || personal.has_children === "true"
                      ? `${personal.children_count || "Sim"} filho(s)`
                      : "Não"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grupos de Perguntas TCC */}
        {groups.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Módulos de Avaliação Clínica ({groups.length})
            </h3>

            <div className="space-y-2.5">
              {groups.map((group) => {
                const isExpanded = expandedGroups[group.id] ?? false;
                const answeredCount = group.answers.filter((a) => a.answer && a.answer.trim().length > 0).length;

                return (
                  <div
                    key={group.id}
                    className="rounded-lg border border-border/80 bg-card transition-all overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-teal-700 font-bold">{group.title}</span>
                        {answeredCount > 0 && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                            {answeredCount} {answeredCount === 1 ? "resposta" : "respostas"}
                          </span>
                        )}
                      </div>

                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/60 bg-muted/10 p-4 space-y-3">
                        {group.answers.map((item, aIdx) => (
                          <div key={aIdx} className="space-y-1 text-xs">
                            <p className="font-semibold text-foreground/90">
                              {item.question}
                            </p>
                            <p className="text-muted-foreground leading-relaxed pl-2 border-l-2 border-teal-500/40">
                              {item.answer && item.answer.trim().length > 0 ? (
                                item.answer
                              ) : (
                                <span className="italic opacity-60">Não preenchido</span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
