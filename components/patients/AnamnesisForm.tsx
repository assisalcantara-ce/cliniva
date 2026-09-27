"use client";

import React, { useState, useMemo } from "react";
import { questionGroups } from "@/lib/constants/anamnesis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AnamnesisPersonalData {
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

export interface AnamnesisQuestionAnswer {
  question: string;
  answer?: string;
}

export interface AnamnesisGroupPayload {
  id: string;
  title: string;
  answers: AnamnesisQuestionAnswer[];
}

export interface AnamnesisFormData {
  personal?: AnamnesisPersonalData;
  groups?: AnamnesisGroupPayload[];
}

export interface AnamnesisFormProps {
  initialData?: AnamnesisFormData | null;
  isSaving?: boolean;
  onSave: (data: AnamnesisFormData) => void;
  onCancel: () => void;
  className?: string;
}

function maskDate(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 8);
  if (numOnly.length <= 2) return numOnly;
  if (numOnly.length <= 4) return `${numOnly.slice(0, 2)}/${numOnly.slice(2)}`;
  return `${numOnly.slice(0, 2)}/${numOnly.slice(2, 4)}/${numOnly.slice(4)}`;
}

function maskCelular(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 11);
  if (numOnly.length <= 2) return numOnly.length > 0 ? `(${numOnly}` : "";
  if (numOnly.length <= 7) return `(${numOnly.slice(0, 2)}) ${numOnly.slice(2)}`;
  return `(${numOnly.slice(0, 2)}) ${numOnly.slice(2, 7)}-${numOnly.slice(7)}`;
}

function maskCPF(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 11);
  if (numOnly.length <= 3) return numOnly;
  if (numOnly.length <= 6) return `${numOnly.slice(0, 3)}.${numOnly.slice(3)}`;
  if (numOnly.length <= 9) return `${numOnly.slice(0, 3)}.${numOnly.slice(3, 6)}.${numOnly.slice(6)}`;
  return `${numOnly.slice(0, 3)}.${numOnly.slice(3, 6)}.${numOnly.slice(6, 9)}-${numOnly.slice(9)}`;
}

export function AnamnesisForm({
  initialData,
  isSaving = false,
  onSave,
  onCancel,
  className = "",
}: AnamnesisFormProps) {
  // 1. Estado local de Dados Pessoais
  const [personal, setPersonal] = useState<AnamnesisPersonalData>(() => ({
    age: initialData?.personal?.age ?? "",
    birth_date: initialData?.personal?.birth_date ?? "",
    marital_status: initialData?.personal?.marital_status ?? "",
    cpf: initialData?.personal?.cpf ?? "",
    email: initialData?.personal?.email ?? "",
    celular: initialData?.personal?.celular ?? "",
    profession: initialData?.personal?.profession ?? "",
    education: initialData?.personal?.education ?? "",
    living_with: initialData?.personal?.living_with ?? "",
    has_children: initialData?.personal?.has_children ?? "",
    children_count: initialData?.personal?.children_count ?? "",
    children_ages: initialData?.personal?.children_ages ?? "",
  }));

  // 2. Estado local das Respostas Clínicas mapeadas por groupId -> question -> answer
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>(() => {
    const initialMap: Record<string, Record<string, string>> = {};
    const existingGroups = initialData?.groups ?? [];
    for (const g of existingGroups) {
      initialMap[g.id] = {};
      for (const a of g.answers) {
        if (a.question) {
          initialMap[g.id][a.question] = a.answer ?? "";
        }
      }
    }
    return initialMap;
  });

  // 3. Controle de expansão de grupos (accordion)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialExpanded: Record<string, boolean> = {};
    if (questionGroups.length > 0) {
      initialExpanded[questionGroups[0].id] = true;
    }
    return initialExpanded;
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handlePersonalChange = (field: keyof AnamnesisPersonalData, value: string) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (groupId: string, question: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] ?? {}),
        [question]: value,
      },
    }));
  };

  // Cálculo de progresso total e por grupo
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalAnswered = 0;
    const groupProgress: Record<string, { answered: number; total: number }> = {};

    for (const group of questionGroups) {
      const gTotal = group.questions.length;
      let gAnswered = 0;
      const gAnswers = answers[group.id] ?? {};

      for (const q of group.questions) {
        if (gAnswers[q] && gAnswers[q].trim().length > 0) {
          gAnswered += 1;
        }
      }

      totalQuestions += gTotal;
      totalAnswered += gAnswered;
      groupProgress[group.id] = { answered: gAnswered, total: gTotal };
    }

    const percentage = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    return { totalQuestions, totalAnswered, percentage, groupProgress };
  }, [answers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Formatar payload estruturado dos 14 grupos
    const formattedGroups: AnamnesisGroupPayload[] = questionGroups.map((group) => {
      const groupAnswersMap = answers[group.id] ?? {};
      const formattedAnswers: AnamnesisQuestionAnswer[] = group.questions.map((q) => ({
        question: q,
        answer: groupAnswersMap[q]?.trim() ? groupAnswersMap[q].trim() : undefined,
      }));

      return {
        id: group.id,
        title: group.title,
        answers: formattedAnswers,
      };
    });

    onSave({
      personal,
      groups: formattedGroups,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Barra de Progresso Geral */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Progresso do Preenchimento</span>
          <span className="font-bold text-teal-700">
            {stats.totalAnswered} de {stats.totalQuestions} perguntas ({stats.percentage}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-teal-600 transition-all duration-300 ease-in-out"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* SEÇÃO 1: DADOS PESSOAIS E PERFIL DO PACIENTE */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/70 pb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-foreground">Perfil e Identificação</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="birth_date" className="text-xs font-medium text-muted-foreground">Data de Nascimento</label>
            <Input
              id="birth_date"
              placeholder="DD/MM/AAAA"
              value={personal.birth_date ?? ""}
              onChange={(e) => handlePersonalChange("birth_date", maskDate(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="age" className="text-xs font-medium text-muted-foreground">Idade</label>
            <Input
              id="age"
              placeholder="Ex: 35"
              value={personal.age ?? ""}
              onChange={(e) => handlePersonalChange("age", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="marital_status" className="text-xs font-medium text-muted-foreground">Estado Civil</label>
            <Input
              id="marital_status"
              placeholder="Ex: Casado(a), Solteiro(a)"
              value={personal.marital_status ?? ""}
              onChange={(e) => handlePersonalChange("marital_status", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cpf" className="text-xs font-medium text-muted-foreground">CPF</label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={personal.cpf ?? ""}
              onChange={(e) => handlePersonalChange("cpf", maskCPF(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="celular" className="text-xs font-medium text-muted-foreground">Celular</label>
            <Input
              id="celular"
              placeholder="(00) 00000-0000"
              value={personal.celular ?? ""}
              onChange={(e) => handlePersonalChange("celular", maskCelular(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">E-mail</label>
            <Input
              id="email"
              type="email"
              placeholder="paciente@email.com"
              value={personal.email ?? ""}
              onChange={(e) => handlePersonalChange("email", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="profession" className="text-xs font-medium text-muted-foreground">Profissão</label>
            <Input
              id="profession"
              placeholder="Ex: Arquiteto(a)"
              value={personal.profession ?? ""}
              onChange={(e) => handlePersonalChange("profession", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="education" className="text-xs font-medium text-muted-foreground">Escolaridade</label>
            <Input
              id="education"
              placeholder="Ex: Superior Completo"
              value={personal.education ?? ""}
              onChange={(e) => handlePersonalChange("education", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="living_with" className="text-xs font-medium text-muted-foreground">Mora com</label>
            <Input
              id="living_with"
              placeholder="Ex: Cônjuge e filhos"
              value={personal.living_with ?? ""}
              onChange={(e) => handlePersonalChange("living_with", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: OS 14 MÓDULOS DE AVALIAÇÃO CLÍNICA TCC */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Módulos de Avaliação Clínica (14 Grupos)
        </h2>

        <div className="space-y-3">
          {questionGroups.map((group) => {
            const isExpanded = expandedGroups[group.id] ?? false;
            const groupStat = stats.groupProgress[group.id] ?? { answered: 0, total: group.questions.length };
            const isComplete = groupStat.answered === groupStat.total && groupStat.total > 0;

            return (
              <div
                key={group.id}
                className="rounded-xl border border-border bg-card transition-all overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between p-4 text-left font-semibold text-foreground hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground">{group.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isComplete
                          ? "bg-emerald-100 text-emerald-800"
                          : groupStat.answered > 0
                          ? "bg-teal-100 text-teal-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {groupStat.answered}/{groupStat.total} preenchidas
                    </span>
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
                  <div className="border-t border-border/70 bg-muted/10 p-5 space-y-4">
                    {group.questions.map((question, qIdx) => {
                      const currentAnswer = answers[group.id]?.[question] ?? "";
                      return (
                        <div key={qIdx} className="space-y-1.5">
                          <label htmlFor={`input-${group.id}-${qIdx}`} className="text-xs font-semibold text-foreground block">
                            {question}
                          </label>
                          <textarea
                            id={`input-${group.id}-${qIdx}`}
                            rows={2}
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(group.id, question, e.target.value)}
                            placeholder="Digite a resposta ou observação clínica..."
                            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 resize-y"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ações de Rodapé */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
          className="text-xs font-semibold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs px-6"
        >
          {isSaving ? "Salvando Anamnese..." : "Salvar Anamnese"}
        </Button>
      </div>
    </form>
  );
}
