"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PatientContextDrawer } from "./PatientContextDrawer";

interface PreSessionViewProps {
  sessionId: string;
  patientId?: string | null;
  patientName?: string | null;
  patientMemory?: string | null;
  lastSessionDate?: string | null;
  isResuming?: boolean;
  onStartSession: () => void;
  onBack?: () => void;
}

interface PreSessionClinicalData {
  resumoClinico?: string;
  temasPrincipais?: string[];
  evolucaoGeral?: string;
  recomendacoesFuturas?: string[];
  padroesRecorrentes?: string[];
  preocupacoesAtuais?: string[];
  fallbackText?: string;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastSessionDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "Primeiro atendimento registrado";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formattedDate = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    if (hours !== "00" || minutes !== "00") {
      return `${formattedDate} às ${hours}:${minutes}`;
    }
    return formattedDate;
  } catch {
    return dateStr;
  }
}

function parseClinicalMemory(raw?: string | null): PreSessionClinicalData | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Tenta parsear como JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      const toList = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (typeof item === "object" && item !== null) {
                const rec = item as Record<string, unknown>;
                const text =
                  rec.title ||
                  rec.nome ||
                  rec.tema ||
                  rec.step ||
                  rec.action ||
                  rec.description ||
                  rec.note ||
                  rec.hypothesis;
                if (typeof text === "string" && text.trim()) return text.trim();
              }
              return null;
            })
            .filter((x): x is string => Boolean(x));
        }
        if (typeof val === "string") {
          return val
            .split(/[\n;•,]+/)
            .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
            .filter((s) => s.length > 0 && !s.startsWith("{") && !s.endsWith("}"));
        }
        return [];
      };

      const toStringVal = (val: unknown): string | undefined => {
        if (!val) return undefined;
        if (typeof val === "string") {
          const t = val.trim();
          return t.length > 0 && !t.startsWith("{") && !t.endsWith("}") ? t : undefined;
        }
        if (Array.isArray(val)) {
          const list = toList(val);
          return list.length > 0 ? list.join(". ") : undefined;
        }
        return undefined;
      };

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const p = parsed as Record<string, unknown>;

        const resumoClinico = toStringVal(
          p.resumo_clinico ||
            p.resumo ||
            p.summary ||
            p.síntese ||
            p.sintese ||
            p.overview
        );

        const temas = toList(
          p.temas_principais ||
            p.temas ||
            p.themes ||
            p.main_themes ||
            p.recurringThemes
        );

        const evolucao = toStringVal(
          p.evolucao_geral ||
            p.evolucao_clinica ||
            p.evolucao ||
            p.progress ||
            p.progresso
        );

        const recomendacoes = toList(
          p.recomendacoes_futuras ||
            p.recomendacoes ||
            p.next_steps ||
            p.proximos_passos ||
            p.proximo_passo ||
            p.estrategias_de_lidar_com_estresse ||
            p.estrategias
        );

        const padroes = toList(
          p.padroes_recorrentes ||
            p.padroes ||
            p.patterns ||
            p.key_patterns ||
            p["padrões_recorrentes"]
        );

        const preocupacoes = toList(
          p.preocupacoes_atuais ||
            p.preocupacoes ||
            p.risks ||
            p.pontos_de_atencao ||
            p.alertas
        );

        const hasAny =
          Boolean(resumoClinico) ||
          temas.length > 0 ||
          Boolean(evolucao) ||
          recomendacoes.length > 0 ||
          padroes.length > 0 ||
          preocupacoes.length > 0;

        if (hasAny) {
          return {
            resumoClinico,
            temasPrincipais: temas.length > 0 ? temas : undefined,
            evolucaoGeral: evolucao,
            recomendacoesFuturas: recomendacoes.length > 0 ? recomendacoes : undefined,
            padroesRecorrentes: padroes.length > 0 ? padroes : undefined,
            preocupacoesAtuais: preocupacoes.length > 0 ? preocupacoes : undefined,
          };
        }
      }
    } catch {
      // Ignora erro de JSON e usa fallback
    }
  }

  // Fallback de texto livre
  const clean = trimmed.replace(/[{}[\]"]/g, "").trim();
  if (clean.length > 0) {
    return { fallbackText: clean };
  }

  return null;
}

export function PreSessionView({
  patientId,
  patientName,
  patientMemory,
  lastSessionDate,
  isResuming = false,
  onStartSession,
  onBack,
}: PreSessionViewProps) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const displayName = patientName || "Paciente";
  const initials = getInitials(patientName);
  const formattedLastDate = formatLastSessionDate(lastSessionDate);
  const clinicalData = parseClinicalMemory(patientMemory);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (patientId) {
      router.push(`/patients/${patientId}`);
    } else {
      router.push("/sessions");
    }
  };

  const hasClinicalContent =
    clinicalData &&
    (clinicalData.resumoClinico ||
      clinicalData.temasPrincipais?.length ||
      clinicalData.evolucaoGeral ||
      clinicalData.recomendacoesFuturas?.length ||
      clinicalData.padroesRecorrentes?.length ||
      clinicalData.preocupacoesAtuais?.length ||
      clinicalData.fallbackText);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#F4F7FA] py-6 sm:py-8 px-4 sm:px-6 flex flex-col justify-start">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* BOTÃO VOLTAR */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-800 transition-all shadow-2xs cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Voltar
          </button>
        </div>

        {/* 1. CABEÇALHO DA SESSÃO */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar Arredondado */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#E8FAF6] text-[#00897B] text-lg font-bold shadow-2xs border border-[#C6EFE7]">
                {initials}
              </div>

              <div className="space-y-1.5">
                {/* Status Badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6EFE7] bg-[#E8FAF6] px-3 py-0.5 text-xs font-semibold text-[#00897B]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00897B] animate-pulse" />
                    {isResuming ? "Atendimento em Andamento" : "Preparação de Atendimento"}
                  </span>
                </div>

                {/* Nome do Paciente */}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                  {displayName}
                </h1>

                {/* Metadados */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Último atendimento: {formattedLastDate}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Atendimento individual
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Principal Iniciar Atendimento */}
            <Button
              onClick={onStartSession}
              className="bg-[#00897B] hover:bg-[#00796B] active:bg-[#00695C] text-white gap-2.5 shadow-xs font-bold text-sm px-7 h-12 rounded-xl cursor-pointer shrink-0 transition-all"
            >
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {isResuming ? "Retomar Atendimento" : "Iniciar Atendimento"}
            </Button>
          </div>
        </div>

        {/* 2. CONTEXTO CLÍNICO & HISTÓRICO */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2EDFF] text-[#7C3AED] shadow-2xs">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-none">
                  Contexto Clínico & Histórico
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resumo das informações relevantes do paciente
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00897B] hover:text-[#00796B] transition-colors cursor-pointer"
            >
              <span>Ver contexto completo</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
          </div>

          {/* Estrutura Clínica Refinada */}
          {hasClinicalContent ? (
            <div className="rounded-2xl bg-[#F8FAFC] p-5 sm:p-6 border border-slate-100/90 space-y-4">
              {/* 1. Resumo clínico */}
              {(clinicalData?.resumoClinico || clinicalData?.fallbackText) && (
                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-2xs mt-0.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <h3 className="font-bold text-slate-900 text-xs">Resumo clínico</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {clinicalData.resumoClinico || clinicalData.fallbackText}
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Temas principais */}
              {clinicalData?.temasPrincipais && clinicalData.temasPrincipais.length > 0 && (
                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs mt-0.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <h3 className="font-bold text-slate-900 text-xs">Temas principais</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {clinicalData.temasPrincipais.join(", ")}.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Evolução geral */}
              {clinicalData?.evolucaoGeral && (
                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs mt-0.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <h3 className="font-bold text-slate-900 text-xs">Evolução geral</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {clinicalData.evolucaoGeral}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Recomendações futuras / Próximos passos */}
              {clinicalData?.recomendacoesFuturas && clinicalData.recomendacoesFuturas.length > 0 && (
                <div className="flex items-start gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-2xs mt-0.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <h3 className="font-bold text-amber-800 text-xs">Recomendações futuras</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {clinicalData.recomendacoesFuturas.join(". ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#F8FAFC] p-6 border border-slate-100/90 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Nenhum histórico anterior registrado para este paciente. À medida que os atendimentos forem realizados, a síntese clínica e as conexões diagnósticas serão apresentadas aqui.
              </p>
            </div>
          )}
        </div>

        {/* 3. APOIO CLÍNICO DO COPILOT EM TEMPO REAL */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8FAF6] text-[#00897B] shadow-2xs">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-slate-900 text-sm">
                  Apoio Clínico do Copilot em Tempo Real
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  Durante o atendimento, o Copilot acompanha a conversa silenciosamente para destacar temas e conexões com o histórico do paciente. Nenhuma sugestão interfere no atendimento ou substitui o julgamento profissional.
                </p>
              </div>
            </div>

            {/* Ilustração / Badge do Copilot Brain */}
            <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E8FAF6] text-[#00897B] border border-[#C6EFE7]/80 shadow-2xs">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWER LATERAL DE CONTEXTO CLÍNICO COMPLETO */}
      <PatientContextDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        patientName={patientName}
        patientMemory={patientMemory}
        lastSessionDate={lastSessionDate}
      />
    </div>
  );
}
