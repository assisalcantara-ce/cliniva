"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClinicalSummaryResponse } from "@/lib/db/patientSummary";
import {
  PatientHeader,
  ClinicalContextCard,
  PatientTimeline,
  AnamnesisView,
  AnamnesisForm,
  type AnamnesisFormData,
  PatientNotesCard,
  PatientRecordSkeleton,
  PatientRecordError,
} from "@/components/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PersonalData = {
  full_name: string;
  age: string;
  birth_date: string;
  marital_status: string;
  cpf: string;
  email: string;
  celular: string;
  profession: string;
  education: string;
  living_with: string;
  has_children: string;
  children_count: string;
  children_ages: string;
};

const emptyPersonalData: PersonalData = {
  full_name: "",
  age: "",
  birth_date: "",
  marital_status: "",
  cpf: "",
  email: "",
  celular: "",
  profession: "",
  education: "",
  living_with: "",
  has_children: "",
  children_count: "",
  children_ages: "",
};

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

function calculateAge(birthDateStr: string): string {
  if (!birthDateStr || birthDateStr.length < 10) return "";
  const [day, month, year] = birthDateStr.split("/").map(Number);
  if (!day || !month || !year || year < 1900 || year > 2100) return "";
  
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  
  return age >= 0 ? age.toString() : "";
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const patientId = use(params).id;
  const router = useRouter();

  const [data, setData] = useState<ClinicalSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Modal de edição (preserva o fluxo existente da tela /patients)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>({ ...emptyPersonalData });
  const [editNotes, setEditNotes] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal de Anamnese
  const [isAnamnesisModalOpen, setIsAnamnesisModalOpen] = useState(false);
  const [isAnamnesisSaving, setIsAnamnesisSaving] = useState(false);
  const [anamnesisError, setAnamnesisError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/clinical-summary`, {
        cache: "no-store",
      });

      if (res.status === 404) {
        setIsNotFound(true);
        setError("Paciente não encontrado.");
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Não foi possível carregar os dados clínicos.");
      }

      const json = (await res.json()) as ClinicalSummaryResponse;
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar prontuário clínico."
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  // Recalcular idade no modal de edição
  useEffect(() => {
    const calculatedAge = calculateAge(editPersonalData.birth_date);
    setEditPersonalData((prev) => ({ ...prev, age: calculatedAge }));
  }, [editPersonalData.birth_date]);

  // Handler: Iniciar atendimento com Copilot 2.0
  const handleStartSession = useCallback(async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: true }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao iniciar sessão.");
      }

      const json = (await res.json()) as { session?: { id: string } };
      if (json.session?.id) {
        router.push(`/sessions/${json.session.id}`);
      }
    } catch (err) {
      console.error("Erro ao iniciar sessão do paciente:", err);
      alert(err instanceof Error ? err.message : "Falha ao iniciar sessão.");
    } finally {
      setIsStartingSession(false);
    }
  }, [patientId, isStartingSession, router]);

  // Handler: Abrir modal de edição com dados existentes
  const handleOpenEdit = useCallback(() => {
    if (!data) return;
    const personal = (data.clinicalContext.anamnesis?.personal as Partial<PersonalData>) ?? {};
    setEditPersonalData({
      full_name: data.patient.fullName ?? "",
      age: personal.age ?? calculateAge(personal.birth_date ?? ""),
      birth_date: personal.birth_date ?? "",
      marital_status: personal.marital_status ?? "",
      cpf: personal.cpf ?? "",
      email: personal.email ?? "",
      celular: personal.celular ?? "",
      profession: personal.profession ?? "",
      education: personal.education ?? "",
      living_with: personal.living_with ?? "",
      has_children: personal.has_children ?? "",
      children_count: personal.children_count ?? "",
      children_ages: personal.children_ages ?? "",
    });
    setEditNotes(data.patient.notes ?? "");
    setEditError(null);
    setIsEditModalOpen(true);
  }, [data]);

  // Handler: Salvar edição do paciente
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPersonalData.full_name.trim()) {
      setEditError("Nome completo é obrigatório");
      return;
    }
    if (!editPersonalData.birth_date.trim()) {
      setEditError("Data de nascimento é obrigatória");
      return;
    }
    if (!editPersonalData.celular.trim()) {
      setEditError("Celular é obrigatório");
      return;
    }

    setIsEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editPersonalData.full_name,
          notes: editNotes.trim().length ? editNotes.trim() : null,
          personal: {
            age: editPersonalData.age,
            birth_date: editPersonalData.birth_date,
            marital_status: editPersonalData.marital_status,
            cpf: editPersonalData.cpf,
            email: editPersonalData.email.toLowerCase(),
            celular: editPersonalData.celular,
            profession: editPersonalData.profession,
            education: editPersonalData.education,
            living_with: editPersonalData.living_with,
            has_children: editPersonalData.has_children,
            children_count: editPersonalData.children_count,
            children_ages: editPersonalData.children_ages,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Falha ao salvar alterações");
      }

      setIsEditModalOpen(false);
      await loadSummary();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao salvar alterações");
    } finally {
      setIsEditSaving(false);
    }
  };

  // Handler: Salvar anamnese do paciente
  const handleSaveAnamnesis = async (formData: AnamnesisFormData) => {
    if (isAnamnesisSaving) return;
    setIsAnamnesisSaving(true);
    setAnamnesisError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/anamnesis`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao salvar anamnese.");
      }

      setIsAnamnesisModalOpen(false);
      await loadSummary();
    } catch (err) {
      setAnamnesisError(
        err instanceof Error ? err.message : "Falha ao salvar anamnese do paciente."
      );
    } finally {
      setIsAnamnesisSaving(false);
    }
  };

  if (isLoading) {
    return <PatientRecordSkeleton />;
  }

  if (error || !data) {
    return (
      <PatientRecordError
        message={error ?? undefined}
        isNotFound={isNotFound}
        onRetry={loadSummary}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER */}
      <PatientHeader
        patient={data.patient}
        onStartSession={handleStartSession}
        onEditPatient={handleOpenEdit}
        isStartingSession={isStartingSession}
      />

      {/* 2. CONTEXTO DO ACOMPANHAMENTO */}
      <ClinicalContextCard context={data.clinicalContext} />

      {/* 3. GRID: LINHA DO TEMPO + ANOTAÇÕES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PatientTimeline timeline={data.timeline} />
        </div>
        <div>
          <PatientNotesCard notes={data.patient.notes} />
        </div>
      </div>

      {/* 4. ANAMNESE & HISTÓRICO CLÍNICO DE BASE */}
      <AnamnesisView
        anamnesis={data.clinicalContext.anamnesis}
        onEditAnamnesis={() => {
          setAnamnesisError(null);
          setIsAnamnesisModalOpen(true);
        }}
      />

      {/* MODAL DE EDIÇÃO DO PACIENTE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
              <h2 className="text-base font-bold text-foreground">Editar Dados do Paciente</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nome completo *</label>
                  <Input
                    value={editPersonalData.full_name}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Data de nascimento *</label>
                  <Input
                    value={editPersonalData.birth_date}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, birth_date: maskDate(e.target.value) }))}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Idade (calculada)</label>
                  <Input
                    value={editPersonalData.age}
                    disabled
                    className="h-9 text-xs opacity-75"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Celular / WhatsApp *</label>
                  <Input
                    value={editPersonalData.celular}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, celular: maskCelular(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CPF</label>
                  <Input
                    value={editPersonalData.cpf}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, cpf: maskCPF(e.target.value) }))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">E-mail</label>
                  <Input
                    type="email"
                    value={editPersonalData.email}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Profissão</label>
                  <Input
                    value={editPersonalData.profession}
                    onChange={(e) => setEditPersonalData((prev) => ({ ...prev, profession: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-foreground">Anotações do Terapeuta</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-600"
                  rows={3}
                  placeholder="Observações gerais sobre o enquadre ou paciente..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditSaving}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isEditSaving}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  {isEditSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ANAMNESE CLÍNICA */}
      {isAnamnesisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-card border border-border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-base font-bold text-foreground">
                  {data.clinicalContext.anamnesis ? "Editar Anamnese Clínica" : "Preencher Anamnese Clínica"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !isAnamnesisSaving && setIsAnamnesisModalOpen(false)}
                disabled={isAnamnesisSaving}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {anamnesisError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  {anamnesisError}
                </div>
              )}

              <AnamnesisForm
                initialData={data.clinicalContext.anamnesis as AnamnesisFormData | null}
                isSaving={isAnamnesisSaving}
                onSave={handleSaveAnamnesis}
                onCancel={() => setIsAnamnesisModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
