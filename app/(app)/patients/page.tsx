"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { questionGroups } from "@/lib/constants/anamnesis";

type Patient = {
  id: string;
  full_name: string;
  notes: string | null;
  created_at?: string;
  patient_number?: number | null;
  is_active?: boolean;
  payload?: {
    personal?: {
      age?: string;
      birth_date?: string;
      cpf?: string;
      celular?: string;
      email?: string;
      marital_status?: string;
      profession?: string;
      education?: string;
      living_with?: string;
      has_children?: string;
      children_count?: string;
      children_ages?: string;
    };
  };
};

type ModalState = {
  isOpen: boolean;
  type: "success" | "info" | "warning" | "error" | null;
  title: string;
  message: string;
};

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

// Funções de máscara
function maskCPF(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 11);
  if (numOnly.length <= 3) return numOnly;
  if (numOnly.length <= 6) return `${numOnly.slice(0, 3)}.${numOnly.slice(3)}`;
  if (numOnly.length <= 9) return `${numOnly.slice(0, 3)}.${numOnly.slice(3, 6)}.${numOnly.slice(6)}`;
  return `${numOnly.slice(0, 3)}.${numOnly.slice(3, 6)}.${numOnly.slice(6, 9)}-${numOnly.slice(9)}`;
}

function maskCelular(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 11);
  if (numOnly.length <= 2) return numOnly.length > 0 ? `(${numOnly}` : "";
  if (numOnly.length <= 7) return `(${numOnly.slice(0, 2)}) ${numOnly.slice(2)}`;
  return `(${numOnly.slice(0, 2)}) ${numOnly.slice(2, 7)}-${numOnly.slice(7)}`;
}

function maskDate(value: string): string {
  const numOnly = value.replace(/\D/g, "").slice(0, 8);
  if (numOnly.length <= 2) return numOnly;
  if (numOnly.length <= 4) return `${numOnly.slice(0, 2)}/${numOnly.slice(2)}`;
  return `${numOnly.slice(0, 2)}/${numOnly.slice(2, 4)}/${numOnly.slice(4)}`;
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

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<"listar" | "cadastrar">("listar");
  const [personalData, setPersonalData] = useState<PersonalData>({ ...emptyPersonalData });
  const [notes, setNotes] = useState("");
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    title: "",
    message: "",
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>({ ...emptyPersonalData });
  const [editNotes, setEditNotes] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);

  async function loadPatients() {
    setError(null);
    const res = await fetch("/api/patients", { cache: "no-store" });
    const json = (await res.json()) as { patients: Patient[] } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar pacientes");
      return;
    }
    if ("patients" in json) setPatients(json.patients);
  }

  useEffect(() => {
    void loadPatients();
  }, []);

  // Sincronizar hash da URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "cadastrar") {
        setActiveTab("cadastrar");
      } else if (hash === "listar") {
        setActiveTab("listar");
      }
    }
  }, []);

  // Calcular idade automaticamente quando birth_date mudar
  useEffect(() => {
    const calculatedAge = calculateAge(personalData.birth_date);
    setPersonalData((prev) => ({ ...prev, age: calculatedAge }));
  }, [personalData.birth_date]);

  useEffect(() => {
    const calculatedAge = calculateAge(editPersonalData.birth_date);
    setEditPersonalData((prev) => ({ ...prev, age: calculatedAge }));
  }, [editPersonalData.birth_date]);

  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  async function createPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!personalData.full_name.trim()) {
      setError("Nome completo é obrigatório");
      return;
    }
    if (!personalData.birth_date.trim()) {
      setError("Data de nascimento é obrigatória");
      return;
    }
    if (!personalData.celular.trim()) {
      setError("Celular é obrigatório");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const groupPayload = questionGroups.map((group) => ({
        id: group.id,
        title: group.title,
        answers: group.questions.map((question) => ({
          question,
          answer: answers[group.id]?.[question] ?? "",
        })),
      }));

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: personalData.full_name,
          notes: notes.trim().length ? notes : undefined,
          anamnesis: {
            personal: {
              age: personalData.age,
              birth_date: personalData.birth_date,
              marital_status: personalData.marital_status,
              cpf: personalData.cpf,
              email: personalData.email.toLowerCase(),
              celular: personalData.celular,
              profession: personalData.profession,
              education: personalData.education,
              living_with: personalData.living_with,
              has_children: personalData.has_children,
              children_count: personalData.children_count,
              children_ages: personalData.children_ages,
            },
            groups: groupPayload,
          },
        }),
      });
      const json = (await res.json()) as { patient: Patient } | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao criar paciente");
        return;
      }
      setPersonalData({ ...emptyPersonalData });
      setNotes("");
      setAnswers({});
      setCurrentGroupIndex(0);
      await loadPatients();
      setActiveTab("listar");
      showModal("success", "Sucesso", "Paciente e anamnese cadastrados com sucesso!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar paciente");
    } finally {
      setIsSaving(false);
    }
  }

  const activeGroup = questionGroups[currentGroupIndex];
  const isFirstGroup = currentGroupIndex === 0;
  const isLastGroup = currentGroupIndex === questionGroups.length - 1;

  function updatePersonalField(field: keyof PersonalData, value: string) {
    setPersonalData((prev) => ({ ...prev, [field]: value }));
  }

  function updateAnswer(groupId: string, question: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] ?? {}),
        [question]: value,
      },
    }));
  }

  function updateEditField(field: keyof PersonalData, value: string) {
    setEditPersonalData((prev) => ({ ...prev, [field]: value }));
  }

  function showModal(type: ModalState["type"], title: string, message: string) {
    setModal({ isOpen: true, type, title, message });
  }

  function closeModal() {
    setModal({ isOpen: false, type: null, title: "", message: "" });
  }

  function openEditModal(patient: Patient) {
    setEditPatientId(patient.id);
    const personal = patient.payload?.personal;
    setEditPersonalData({
      full_name: patient.full_name || "",
      age: personal?.age || "",
      birth_date: personal?.birth_date || "",
      marital_status: personal?.marital_status || "",
      cpf: personal?.cpf || "",
      email: personal?.email || "",
      celular: personal?.celular || "",
      profession: personal?.profession || "",
      education: personal?.education || "",
      living_with: personal?.living_with || "",
      has_children: personal?.has_children || "",
      children_count: personal?.children_count || "",
      children_ages: personal?.children_ages || "",
    });
    setEditNotes(patient.notes || "");
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setIsEditModalOpen(false);
    setEditPatientId(null);
    setEditPersonalData({ ...emptyPersonalData });
    setEditNotes("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPatientId) return;

    if (!editPersonalData.full_name.trim()) {
      showModal("warning", "Atenção", "Nome completo é obrigatório");
      return;
    }
    if (!editPersonalData.birth_date.trim()) {
      showModal("warning", "Atenção", "Data de nascimento é obrigatória");
      return;
    }
    if (!editPersonalData.celular.trim()) {
      showModal("warning", "Atenção", "Celular é obrigatório");
      return;
    }

    setIsEditSaving(true);
    try {
      const res = await fetch(`/api/patients/${editPatientId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
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
        showModal("error", "Erro", "Falha ao salvar alterações");
        return;
      }

      await loadPatients();
      closeEditModal();
      showModal("success", "Salvo com sucesso", "Dados atualizados com sucesso");
    } catch {
      showModal("error", "Erro", "Falha ao salvar alterações");
    } finally {
      setIsEditSaving(false);
    }
  }

  async function updatePatientStatus(patientId: string, nextActive: boolean) {
    try {
      const res = await fetch(`/api/patients/${patientId}/deactivate`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        const message = json?.error ?? "Falha ao atualizar status";
        showModal("error", "Erro", message);
        return;
      }

      await loadPatients();
      showModal(
        "success",
        nextActive ? "Paciente Ativado" : "Paciente Inativado",
        nextActive ? "Registro ativo com sucesso" : "Registro inativo com sucesso"
      );
    } catch {
      showModal("error", "Erro", "Falha ao atualizar status");
    }
  }

  // Filtragem Geral
  const filteredPatients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return patients.filter((p) => {
      const isActive = p.is_active !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      if (!matchesStatus) return false;

      if (!query) return true;

      const nameMatch = p.full_name.toLowerCase().includes(query);
      const notesMatch = p.notes ? p.notes.toLowerCase().includes(query) : false;
      const cpfMatch = p.payload?.personal?.cpf ? p.payload.personal.cpf.replace(/\D/g, "").includes(query.replace(/\D/g, "")) : false;
      const celularMatch = p.payload?.personal?.celular ? p.payload.personal.celular.includes(query) : false;

      return nameMatch || notesMatch || cpfMatch || celularMatch;
    });
  }, [patients, searchQuery, statusFilter]);

  // Cálculos de Paginação
  const totalItems = filteredPatients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPatients = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, validCurrentPage, pageSize]);

  // KPIs
  const totalPatientsCount = patients.length;
  const activePatientsCount = useMemo(() => patients.filter((p) => p.is_active !== false).length, [patients]);
  const inactivePatientsCount = useMemo(() => patients.filter((p) => p.is_active === false).length, [patients]);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= validCurrentPage - delta && i <= validCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
  }, [totalPages, validCurrentPage]);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  function handlePrintList() {
    const printWindow = window.open("", "", "width=900,height=700");
    if (!printWindow) return;

    const rows = filteredPatients
      .map(
        (p) => `
      <tr style="border-bottom: 1px solid #ddd; ${!p.is_active ? "opacity: 0.6;" : ""}">
        <td style="padding: 10px;">${p.full_name.toUpperCase()}</td>
        <td style="padding: 10px;">${p.payload?.personal?.celular || "—"}</td>
        <td style="padding: 10px;">—</td>
        <td style="padding: 10px;">${p.notes || "—"}</td>
        <td style="padding: 10px; text-align: center;">${!p.is_active ? '<strong style="color: #dc2626;">Inativo</strong>' : "Ativo"}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Listagem de Pacientes</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #0f766e; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #0f766e; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>📋 Listagem de Pacientes</h1>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Celular</th>
              <th>Último Atendimento</th>
              <th>Observações</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="footer">
          <p>Total de pacientes: <strong>${filteredPatients.length}</strong></p>
          <p>Data da impressão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }

  return (
    <div className="patients-page space-y-6">
      {/* 1. CABEÇALHO */}
      <div className="page-header">
        <div className="title-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-700 shadow-2xs">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M7 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Pacientes
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                Gestão e prontuários clínicos dos pacientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("cadastrar");
                window.location.hash = "cadastrar";
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 active:bg-teal-800 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Cadastrar Paciente
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("listar");
              window.location.hash = "listar";
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "listar"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Listar pacientes
            <span className="text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
              {patients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("cadastrar");
              window.location.hash = "cadastrar";
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "cadastrar"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Novo Cadastro & Anamnese
          </button>
        </div>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {/* ABA 1: LISTAR PACIENTES */}
      {activeTab === "listar" && (
        <div className="space-y-6">
          {/* 2. RESUMO RÁPIDO (Indicadores Contextuais Discretos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">{totalPatientsCount}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Total de pacientes</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">{activePatientsCount}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Pacientes ativos</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">{inactivePatientsCount}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Pacientes inativos</div>
              </div>
            </div>
          </div>

          {/* 3. BUSCA E FILTROS */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Busca por nome ou CPF */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, CPF ou observações..."
                  className="w-full pl-10 pr-9 py-2 text-sm bg-[#F3FBF9] border-[#DBE5E1] rounded-xl focus:border-teal-500 focus:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro de Status */}
              <div className="w-full md:w-44">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] px-3.5 py-2 text-sm text-slate-800 font-medium focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Apenas Ativos</option>
                  <option value="inactive">Apenas Inativos</option>
                </Select>
              </div>

              {/* Botão Imprimir */}
              <button
                type="button"
                onClick={handlePrintList}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
                title="Imprimir relatório da listagem"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Imprimir
              </button>
            </div>
          </div>

          {/* 4. LISTA DE PACIENTES */}
          <div className="space-y-4">
            {filteredPatients.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-3.5">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery || statusFilter !== "all"
                    ? "Nenhum paciente encontrado para os filtros selecionados"
                    : "Nenhum paciente cadastrado ainda"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Tente ajustar o termo de busca ou alterar o filtro de status."
                    : "Cadastre seu primeiro paciente com dados completos e anamnese clicando na aba 'Novo Cadastro'."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paginatedPatients.map((p) => {
                  const isActive = p.is_active !== false;
                  const initials = getInitials(p.full_name);
                  const celular = p.payload?.personal?.celular;
                  const cpf = p.payload?.personal?.cpf;

                  return (
                    <div
                      key={p.id}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs transition-all ${
                        isActive
                          ? "border-slate-200/90 hover:border-teal-400/80 hover:shadow-xs"
                          : "border-slate-200/60 bg-slate-50/40 opacity-75"
                      }`}
                    >
                      {/* 1. Paciente & Identificação */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-800 font-bold text-xs shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/patients/${p.id}`}
                              className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate block"
                            >
                              {p.full_name.toUpperCase()}
                            </Link>
                            {p.patient_number != null && (
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                #{String(p.patient_number).padStart(3, "0")}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-xs text-slate-500">
                            {/* Status */}
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isActive ? "text-emerald-700" : "text-red-600"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {isActive ? "Ativo" : "Inativo"}
                            </span>

                            {/* Celular */}
                            {celular && (
                              <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {celular}
                              </span>
                            )}

                            {/* CPF */}
                            {cpf && (
                              <span className="hidden md:inline-flex text-slate-400 font-mono text-[11px]">
                                CPF: {cpf}
                              </span>
                            )}
                          </div>

                          {/* Notas */}
                          {p.notes && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                              &ldquo;{p.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 2. Ações Clínicas */}
                      <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                        {/* Histórico de Sessões */}
                        <Link
                          href={`/patients/${p.id}/sessions`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
                          title="Histórico de Sessões e Atendimentos"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </Link>

                        {/* Editar Ficha */}
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                          title="Editar Cadastro do Paciente"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>

                        {/* Ativar / Inativar */}
                        <button
                          type="button"
                          onClick={() => updatePatientStatus(p.id, !isActive)}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors shadow-2xs cursor-pointer ${
                            isActive
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={isActive ? "Inativar Paciente" : "Ativar Paciente"}
                        >
                          {isActive ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>

                        {/* Prontuário Completo */}
                        <Link
                          href={`/patients/${p.id}`}
                          className="inline-flex items-center gap-1 justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                          title="Abrir Prontuário do Paciente"
                        >
                          <span>Prontuário</span>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. BARRA DE PAGINAÇÃO */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs">
                {/* Informações da página */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Mostrando <strong className="text-slate-800 font-semibold">{startItem}</strong> a{" "}
                    <strong className="text-slate-800 font-semibold">{endItem}</strong> de{" "}
                    <strong className="text-slate-800 font-semibold">{totalItems}</strong> pacientes
                  </span>

                  {/* Seletor de itens por página */}
                  <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <span className="text-slate-400">Por página:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-[#F3FBF9] px-2 py-1 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Controles de Navegação */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    {/* Botão Anterior */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={validCurrentPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {/* Números das páginas */}
                    <div className="flex items-center gap-1">
                      {paginationRange.map((p, idx) => {
                        if (p === "...") {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-2 text-xs font-medium text-slate-400">
                              ...
                            </span>
                          );
                        }
                        const pageNum = p as number;
                        const isActive = pageNum === validCurrentPage;

                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? "bg-teal-600 text-white shadow-2xs"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-teal-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Botão Próxima */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={validCurrentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CADASTRAR PACIENTE & ANAMNESE */}
      {activeTab === "cadastrar" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Identificação e Dados Pessoais */}
          <Card className="admin-card rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <CardHeader className="admin-card__header border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="admin-card__title text-base sm:text-lg font-bold text-slate-900">
                    Identificação e Dados Pessoais
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Preencha as informações básicas cadastrais do paciente
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="admin-card__content p-6 max-h-[620px] overflow-y-auto">
              <form id="patient-form" onSubmit={createPatient} className="space-y-4">
                <div className="form-grid">
                  <div className="field col-span-4">
                    <label className="label">Nome completo *</label>
                    <Input
                      value={personalData.full_name}
                      onChange={(e) => updatePersonalField("full_name", e.target.value)}
                      placeholder="Ex.: Maria Silva Alcantara"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Data de nascimento *</label>
                    <Input
                      value={personalData.birth_date}
                      onChange={(e) => updatePersonalField("birth_date", maskDate(e.target.value))}
                      placeholder="DD/MM/AAAA"
                      className="control"
                      maxLength={10}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Idade</label>
                    <Input
                      value={personalData.age}
                      disabled
                      placeholder="Auto"
                      className="control opacity-75"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Estado civil</label>
                    <Select
                      value={personalData.marital_status}
                      onChange={(e) => updatePersonalField("marital_status", e.target.value)}
                      className="control"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                      <option value="Separado(a)">Separado(a)</option>
                      <option value="Uniao estavel">União estável</option>
                    </Select>
                  </div>
                  <div className="field col-span-2">
                    <label className="label">CPF</label>
                    <Input
                      value={personalData.cpf}
                      onChange={(e) => updatePersonalField("cpf", maskCPF(e.target.value))}
                      placeholder="Ex.: 000.000.000-00"
                      className="control"
                      maxLength={14}
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Email</label>
                    <Input
                      value={personalData.email}
                      onChange={(e) => updatePersonalField("email", e.target.value.toLowerCase())}
                      placeholder="Ex.: email@example.com"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Celular *</label>
                    <Input
                      value={personalData.celular}
                      onChange={(e) => updatePersonalField("celular", maskCelular(e.target.value))}
                      placeholder="Ex.: (11) 99999-9999"
                      className="control"
                      maxLength={15}
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Profissão</label>
                    <Input
                      value={personalData.profession}
                      onChange={(e) => updatePersonalField("profession", e.target.value)}
                      placeholder="Ex.: Arquiteta"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Escolaridade</label>
                    <Select
                      value={personalData.education}
                      onChange={(e) => updatePersonalField("education", e.target.value)}
                      className="control"
                    >
                      <option value="">Selecione...</option>
                      <option value="Ensino fundamental incompleto">Ens. fund. incompleto</option>
                      <option value="Ensino fundamental completo">Ens. fund. completo</option>
                      <option value="Ensino medio incompleto">Ens. médio incompleto</option>
                      <option value="Ensino medio completo">Ens. médio completo</option>
                      <option value="Ensino superior incompleto">Ens. superior incompleto</option>
                      <option value="Ensino superior completo">Ens. superior completo</option>
                      <option value="Pos-graduacao">Pós-graduação</option>
                    </Select>
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Com quem mora atualmente?</label>
                    <Input
                      value={personalData.living_with}
                      onChange={(e) => updatePersonalField("living_with", e.target.value)}
                      placeholder="Ex.: Com cônjuge e filhos"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-4">
                    <div className="children-fields-row">
                      <div className="field">
                        <label className="label">Filhos?</label>
                        <Select
                          value={personalData.has_children}
                          onChange={(e) => updatePersonalField("has_children", e.target.value)}
                          className="control"
                        >
                          <option value="">Selecione...</option>
                          <option value="Sim">Sim</option>
                          <option value="Nao">Não</option>
                        </Select>
                      </div>
                      <div className="field">
                        <label className="label">Quantos?</label>
                        <Input
                          value={personalData.children_count}
                          onChange={(e) => updatePersonalField("children_count", e.target.value)}
                          placeholder="Ex.: 2"
                          className="control"
                        />
                      </div>
                      <div className="field">
                        <label className="label">Idades</label>
                        <Input
                          value={personalData.children_ages}
                          onChange={(e) => updatePersonalField("children_ages", e.target.value)}
                          placeholder="Ex.: 6, 9"
                          className="control"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Notas clínicas adicionais (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F3FBF9] p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Observações iniciais ou pontos de atenção..."
                    rows={2}
                  />
                </div>

                <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-3.5 text-xs text-teal-800">
                  💡 A anamnese fica vinculada ao prontuário do paciente. Preencha as etapas ao lado e avance até finalizar.
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Banco de Questões da Anamnese */}
          <Card className="admin-card rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            <CardHeader className="admin-card__header border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="admin-card__title text-base sm:text-lg font-bold text-slate-900">
                      Banco de Questões
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grupo {currentGroupIndex + 1} de {questionGroups.length}: {activeGroup.title}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="admin-card__content flex flex-col flex-1 p-0">
              <div className="space-y-4 overflow-y-auto flex-1 px-6 pt-6 max-h-[480px]">
                <div className="space-y-3">
                  <div className="text-sm font-bold text-teal-800 border-b border-teal-100 pb-1">
                    {activeGroup.title}
                  </div>
                  {activeGroup.questions.map((q) => (
                    <div key={q} className="field space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">{q}</label>
                      <textarea
                        value={answers[activeGroup.id]?.[q] ?? ""}
                        onChange={(e) => updateAnswer(activeGroup.id, q, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-[#F3FBF9] p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Digite a resposta do paciente..."
                        rows={
                          ["avaliacao-cognitiva", "crencas-centrais", "comportamentos-desadaptativos"].includes(activeGroup.id)
                            ? 1
                            : 2
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 px-6 pb-6 border-t border-slate-100 mt-4 bg-slate-50/50">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isFirstGroup}
                  onClick={() => setCurrentGroupIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl cursor-pointer"
                >
                  Voltar
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={isLastGroup}
                    onClick={() => setCurrentGroupIndex((prev) => Math.min(questionGroups.length - 1, prev + 1))}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    Próximo
                  </Button>
                  <Button
                    type="submit"
                    form="patient-form"
                    disabled={isSaving || !isLastGroup}
                    className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl shadow-xs cursor-pointer font-semibold"
                  >
                    {isSaving ? "Salvando..." : "Salvar paciente e anamnese"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900">Editar Dados do Paciente</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <div className="form-grid">
                <div className="field col-span-4">
                  <label className="label">Nome completo *</label>
                  <Input
                    value={editPersonalData.full_name}
                    onChange={(e) => updateEditField("full_name", e.target.value)}
                    placeholder="Ex.: Maria Silva"
                    className="control"
                  />
                </div>
                <div className="field col-span-2">
                  <label className="label">Data de nascimento *</label>
                  <Input
                    value={editPersonalData.birth_date}
                    onChange={(e) => updateEditField("birth_date", maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    className="control"
                    maxLength={10}
                  />
                </div>
                <div className="field">
                  <label className="label">Idade</label>
                  <Input
                    value={editPersonalData.age}
                    disabled
                    placeholder="Auto"
                    className="control opacity-75"
                  />
                </div>
                <div className="field">
                  <label className="label">Estado civil</label>
                  <Select
                    value={editPersonalData.marital_status}
                    onChange={(e) => updateEditField("marital_status", e.target.value)}
                    className="control"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="Separado(a)">Separado(a)</option>
                    <option value="Uniao estavel">União estável</option>
                  </Select>
                </div>
                <div className="field col-span-2">
                  <label className="label">CPF</label>
                  <Input
                    value={editPersonalData.cpf}
                    onChange={(e) => updateEditField("cpf", maskCPF(e.target.value))}
                    placeholder="Ex.: 000.000.000-00"
                    className="control"
                    maxLength={14}
                  />
                </div>
                <div className="field col-span-2">
                  <label className="label">Email</label>
                  <Input
                    value={editPersonalData.email}
                    onChange={(e) => updateEditField("email", e.target.value.toLowerCase())}
                    placeholder="Ex.: email@example.com"
                    className="control"
                  />
                </div>
                <div className="field col-span-2">
                  <label className="label">Celular *</label>
                  <Input
                    value={editPersonalData.celular}
                    onChange={(e) => updateEditField("celular", maskCelular(e.target.value))}
                    placeholder="Ex.: (11) 99999-9999"
                    className="control"
                    maxLength={15}
                  />
                </div>
                <div className="field col-span-2">
                  <label className="label">Profissão</label>
                  <Input
                    value={editPersonalData.profession}
                    onChange={(e) => updateEditField("profession", e.target.value)}
                    placeholder="Ex.: Designer"
                    className="control"
                  />
                </div>
                <div className="field col-span-2">
                  <label className="label">Escolaridade</label>
                  <Select
                    value={editPersonalData.education}
                    onChange={(e) => updateEditField("education", e.target.value)}
                    className="control"
                  >
                    <option value="">Selecione...</option>
                    <option value="Ensino fundamental incompleto">Ens. fund. incompleto</option>
                    <option value="Ensino fundamental completo">Ens. fund. completo</option>
                    <option value="Ensino medio incompleto">Ens. médio incompleto</option>
                    <option value="Ensino medio completo">Ens. médio completo</option>
                    <option value="Ensino superior incompleto">Ens. superior incompleto</option>
                    <option value="Ensino superior completo">Ens. superior completo</option>
                    <option value="Pos-graduacao">Pós-graduação</option>
                  </Select>
                </div>
                <div className="field col-span-2">
                  <label className="label">Com quem mora atualmente?</label>
                  <Input
                    value={editPersonalData.living_with}
                    onChange={(e) => updateEditField("living_with", e.target.value)}
                    placeholder="Ex.: Com cônjuge e filhos"
                    className="control"
                  />
                </div>
                <div className="field col-span-4">
                  <div className="children-fields-row">
                    <div className="field">
                      <label className="label">Filhos?</label>
                      <Select
                        value={editPersonalData.has_children}
                        onChange={(e) => updateEditField("has_children", e.target.value)}
                        className="control"
                      >
                        <option value="">Selecione...</option>
                        <option value="Sim">Sim</option>
                        <option value="Nao">Não</option>
                      </Select>
                    </div>
                    <div className="field">
                      <label className="label">Quantos?</label>
                      <Input
                        value={editPersonalData.children_count}
                        onChange={(e) => updateEditField("children_count", e.target.value)}
                        placeholder="Ex.: 2"
                        className="control"
                      />
                    </div>
                    <div className="field">
                      <label className="label">Idades</label>
                      <Input
                        value={editPersonalData.children_ages}
                        onChange={(e) => updateEditField("children_ages", e.target.value)}
                        placeholder="Ex.: 6, 9"
                        className="control"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label">Notas (opcional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F3FBF9] p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Observações rápidas..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  disabled={isEditSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isEditSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FEEDBACK / ALERTA */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-sm w-full">
            <div className="flex items-start gap-4">
              {modal.type === "success" && (
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {modal.type === "error" && (
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              )}
              {modal.type === "warning" && (
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              )}
              {modal.type === "info" && (
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{modal.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{modal.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="w-full mt-6 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
