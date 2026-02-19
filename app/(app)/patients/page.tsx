"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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

type QuestionGroup = {
  id: string;
  title: string;
  questions: string[];
};

const questionGroups: QuestionGroup[] = [
  {
    id: "queixa-principal",
    title: "1. Queixa Principal e Motivo da Procura",
    questions: [
      "O que trouxe você a terapia neste momento?",
      "Há quanto tempo isso tem acontecido?",
      "Como isso afeta sua vida cotidiana?",
    ],
  },
  {
    id: "historia-familiar",
    title: "2. História Familiar",
    questions: [
      "Como você descreveria sua família de origem?",
      "Como era sua relação com seus pais na infância? E atualmente?",
      "Há histórico familiar de transtornos mentais, dependência química ou suicídio?",
    ],
  },
  {
    id: "desenvolvimento-infantil",
    title: "3. Desenvolvimento Infantil",
    questions: [
      "Como foi sua infância?",
      "Há lembranças marcantes (boas ou ruins)?",
      "Como era seu comportamento na escola e em casa?",
    ],
  },
  {
    id: "relacoes-afetivas",
    title: "4. Relações Afetivas e Sociais",
    questions: [
      "Você se considera uma pessoa sociável?",
      "Tem amigos próximos ou rede de apoio?",
      "Está em um relacionamento? Como o descreveria?",
    ],
  },
  {
    id: "saude-fisica-mental",
    title: "5. Saúde Física e Mental",
    questions: [
      "Já teve algum diagnóstico médico ou psiquiátrico?",
      "Faz uso de medicamentos? Quais?",
      "Já passou por internações ou tratamentos psicológicos/psiquiátricos?",
    ],
  },
  {
    id: "uso-substancias",
    title: "6. Uso de Substâncias",
    questions: [
      "Faz uso de álcool, cigarro, maconha ou outras substâncias?",
      "Com que frequência?",
      "Isso afeta seu cotidiano?",
    ],
  },
  {
    id: "rotina-autocuidado",
    title: "7. Rotina e Autocuidado",
    questions: [
      "Como é um dia típico seu?",
      "Como está seu sono e alimentação?",
      "Pratica alguma atividade física ou lazer?",
    ],
  },
  {
    id: "estressores-enfrentamento",
    title: "8. Estressores Atuais e Estratégias de Enfrentamento",
    questions: [
      "O que tem te causado mais estresse ultimamente?",
      "Como você costuma lidar com situações difíceis?",
      "Costuma conversar com alguém sobre seus sentimentos?",
    ],
  },
  {
    id: "expectativas-terapia",
    title: "9. Expectativas com a Psicoterapia",
    questions: [
      "O que você espera alcançar com a terapia?",
      "Já fez terapia antes? Como foi a experiência?",
      "Há algo que gostaria que eu soubesse sobre você?",
    ],
  },
  {
    id: "avaliacao-cognitiva",
    title: "10. Avaliação Cognitiva",
    questions: [
      "Quais pensamentos costumam surgir quando você se sente ansioso/triste/irritado?",
      "Você percebe algum padrão de pensamento repetitivo?",
      "Costuma se criticar com frequência? Em que situações?",
      "Como você interpreta eventos negativos que ocorrem em sua vida?",
      "Você sente que pensa 'sempre tudo dá errado' ou 'nunca faço nada certo'?",
    ],
  },
  {
    id: "crencas-centrais",
    title: "11. Crenças Centrais e Intermediárias",
    questions: [
      "Se você tivesse que se descrever em poucas palavras, como o faria?",
      "O que você acredita que as outras pessoas pensam de você?",
      "O que você acredita que precisa fazer para ser aceito ou ter valor?",
      "Há alguma ideia que você sente ser verdade absoluta sobre você mesmo ou sobre o mundo?",
    ],
  },
  {
    id: "comportamentos-desadaptativos",
    title: "12. Comportamentos Desadaptativos",
    questions: [
      "Quando está em sofrimento, o que você costuma fazer?",
      "Você evita certas situações, lugares ou pessoas? Quais e por quê?",
      "Já percebeu que repete certos comportamentos mesmo sabendo que são prejudiciais?",
      "Usa algo para se acalmar (comida, redes sociais, compras, etc.)?",
    ],
  },
  {
    id: "situacoes-emocionais",
    title: "13. Registro de Situações Emocionais Frequentes",
    questions: [
      "Quais situações costumam te deixar mais abalado emocionalmente?",
      "Como você reage fisicamente, emocionalmente e mentalmente nessas situações?",
      "O que você faz depois desses episódios?",
    ],
  },
  {
    id: "metas-terapeuticas",
    title: "14. Metas Terapêuticas (na ótica do paciente)",
    questions: [
      "Se esta terapia for bem-sucedida, o que mudará na sua vida?",
      "Quais habilidades você gostaria de desenvolver?",
      "Que tipo de pensamento ou comportamento você gostaria de modificar?",
    ],
  },
];

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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [personalData, setPersonalData] = useState<PersonalData>({ ...emptyPersonalData });
  const [notes, setNotes] = useState("");
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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

  // Calcular idade automaticamente quando birth_date mudar
  useEffect(() => {
    const calculatedAge = calculateAge(personalData.birth_date);
    setPersonalData((prev) => ({ ...prev, age: calculatedAge }));
  }, [personalData.birth_date]);

  useEffect(() => {
    const calculatedAge = calculateAge(editPersonalData.birth_date);
    setEditPersonalData((prev) => ({ ...prev, age: calculatedAge }));
  }, [editPersonalData.birth_date]);

  async function createPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!personalData.full_name.trim()) {
      setError("Nome completo e obrigatorio");
      return;
    }
    if (!personalData.birth_date.trim()) {
      setError("Data de nascimento e obrigatoria");
      return;
    }
    if (!personalData.celular.trim()) {
      setError("Celular e obrigatorio");
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

  function showModal(
    type: "success" | "info" | "warning" | "error",
    title: string,
    message: string
  ) {
    setModal({ isOpen: true, type, title, message });
  }

  function closeModal() {
    setModal({ isOpen: false, type: null, title: "", message: "" });
  }

  function openEditModal(patient: Patient) {
    const personal = patient.payload?.personal ?? {};
    setEditPatientId(patient.id);
    setEditPersonalData({
      full_name: patient.full_name ?? "",
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
    setEditNotes(patient.notes ?? "");
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
    } catch (err) {
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
    } catch (err) {
      showModal("error", "Erro", "Falha ao atualizar status");
    }
  }

  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    const isActive = p.is_active !== false;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);

    if (!matchesStatus) return false;

    return (
      p.full_name.toLowerCase().includes(query) ||
      (p.notes && p.notes.toLowerCase().includes(query))
    );
  });

  function handlePrintList() {
    const printWindow = window.open("", "", "width=900,height=700");
    if (!printWindow) return;

    const rows = filteredPatients
      .map(
        (p) => `
      <tr style="border-bottom: 1px solid #ddd; ${!p.is_active ? 'opacity: 0.6;' : ''}">
        <td style="padding: 10px;">${p.full_name.toUpperCase()}</td>
        <td style="padding: 10px;">${p.payload?.personal?.celular || "—"}</td>
        <td style="padding: 10px;">—</td>
        <td style="padding: 10px;">${p.notes || "—"}</td>
        <td style="padding: 10px; text-align: center;">${!p.is_active ? '<strong style="color: #dc2626;">Inativo</strong>' : 'Ativo'}</td>
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
    <div className="patients-page space-y-0">
      <span id="listar" className="tab-anchor" />
      <span id="cadastrar" className="tab-anchor" />
      <div className="page-header">
        <div className="title-row">
          <svg className="title-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{width: '40px', height: '40px'}}>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#0f766e" strokeWidth="2"/>
            <path d="M7 9h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 13h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 17h6" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h1 className="page-title" style={{fontSize: '32px'}}>Pacientes</h1>
        </div>
        <div className="tabs">
          <a href="#listar" className="tab tab--listar tab--active">
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="#0f766e" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="#0f766e" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="#0f766e" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="#0f766e" strokeWidth="2"/>
            </svg>
            Listar pacientes
          </a>
          <a href="#cadastrar" className="tab tab--cadastrar">
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="#0f766e" strokeWidth="2"/>
              <path d="M12 7v10" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 12h10" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Cadastrar
          </a>
        </div>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="tab-panels">
        <div className="tab-panel panel-listar">
          <div className="mb-6">
            <Card className="admin-card">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <label className="label" style={{margin: 0}}>NOME ou CPF do paciente</label>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Digite aqui..."
                        className="control w-full"
                      />
                    </div>
                    <div className="w-40 shrink-0">
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                        className="control w-full"
                      >
                        <option value="all">Todos</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        // Busca já é feita via filteredPatients
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-8 shrink-0"
                    >
                      BUSCAR
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="admin-card">
            <CardHeader className="admin-card__header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-teal-700" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                  <CardTitle className="admin-card__title text-lg font-bold">Listagem de Pacientes</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total: <span className="text-sm font-semibold text-foreground">{filteredPatients.length}</span>
                  </span>
                  <button
                    onClick={handlePrintList}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
                    title="Imprimir lista de pacientes"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v2h12V3z" fill="currentColor"/>
                    </svg>
                    IMPRIMIR
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="admin-card__content h-[650px] overflow-y-auto p-0">
              {filteredPatients.length === 0 ? (
                <div className="p-8 text-sm text-center text-muted-foreground">
                  {searchQuery ? "Nenhum paciente encontrado" : "Sem pacientes ainda."}
                </div>
              ) : (
                <div className="w-full">
                  {/* Cabeçalho da Tabela */}
                  <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white border-b border-teal-800">
                    <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-bold uppercase tracking-wide">
                      <div className="col-span-1">ID</div>
                      <div className="col-span-2">Nome</div>
                      <div className="col-span-2 text-center">Celular</div>
                      <div className="col-span-2 text-center">Último Atendimento</div>
                      <div className="col-span-3">Observações</div>
                      <div className="col-span-2 text-right pr-2">Ações</div>
                    </div>
                  </div>

                  {/* Linhas da Tabela */}
                  <div className="divide-y divide-gray-200">
                    {filteredPatients.map((p) => {
                      const isActive = p.is_active !== false;

                      return (
                        <div
                          key={p.id}
                          className={`patients-table-row grid grid-cols-12 gap-3 px-6 py-4 hover:bg-gray-50 transition-all items-center`}
                        >
                        <div className={`col-span-1 ${!isActive ? "opacity-60" : ""}`}>
                          <div className="font-bold text-sm text-gray-700">
                            {p.patient_number ?? "—"}
                          </div>
                        </div>
                        <div className={`col-span-2 ${!isActive ? "opacity-60" : ""}`}>
                          <div className="font-semibold text-sm text-foreground">{p.full_name.toUpperCase()}</div>
                          <div
                            className={`text-xs font-semibold mt-0.5 ${
                              isActive ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isActive ? "Ativo" : "Inativo"}
                          </div>
                        </div>
                        <div className={`col-span-2 text-center text-xs font-mono text-gray-700 ${!isActive ? "opacity-60" : ""}`}>
                          {p.payload?.personal?.celular || "—"}
                        </div>
                        <div className={`col-span-2 text-center text-xs text-gray-600 ${!isActive ? "opacity-60" : ""}`}>
                          —
                        </div>
                        <div className={`col-span-3 ${!isActive ? "opacity-60" : ""}`}>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {p.notes || "—"}
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <Link
                            href={`/patients/${p.id}/sessions`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            title="Histórico de Atendimentos"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                            </svg>
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            title="Editar Ficha"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
                              <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePatientStatus(p.id, !isActive)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                              isActive
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white opacity-100"
                            }`}
                            title={isActive ? "Inativar Paciente" : "Ativar Paciente"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="tab-panel panel-cadastrar">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Identificacao e dados pessoais</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content h-[650px] overflow-y-auto">
                <form id="patient-form" onSubmit={createPatient} className="space-y-4">
                  <div className="form-grid">
                    <div className="field col-span-4">
                      <label className="label">Nome completo *</label>
                      <Input
                        value={personalData.full_name}
                        onChange={(e) => updatePersonalField("full_name", e.target.value)}
                        placeholder="Ex.: Maria Silva"
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
                      <label className="label">Profissao</label>
                      <Input
                        value={personalData.profession}
                        onChange={(e) => updatePersonalField("profession", e.target.value)}
                        placeholder="Ex.: Designer"
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
                        placeholder="Ex.: Com conjuge e filhos"
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
                    <label className="label">Notas (opcional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background control"
                      placeholder="Observacoes rapidas..."
                      rows={2}
                      />
                  </div>

                  <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    A anamnese é vinculada ao paciente. Preencha os grupos ao lado e avance
                    ate salvar.
                  </div>

                </form>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Banco de questoes</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content flex flex-col h-[650px] p-0">
                <div className="space-y-4 overflow-y-auto flex-1 px-6 pt-6">
                  <div className="text-xs text-muted-foreground">
                    Grupo {currentGroupIndex + 1} de {questionGroups.length}
                  </div>
                  <div className="space-y-3">
                    <div className="section-subtitle">{activeGroup.title}</div>
                    {activeGroup.questions.map((q) => (
                      <div key={q} className="field space-y-2">
                        <div className="text-sm text-foreground">{q}</div>
                        <textarea
                          value={answers[activeGroup.id]?.[q] ?? ""}
                          onChange={(e) => updateAnswer(activeGroup.id, q, e.target.value)}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background control"
                          placeholder="Digite a resposta..."
                          rows={['avaliacao-cognitiva', 'crencas-centrais', 'comportamentos-desadaptativos'].includes(activeGroup.id) ? 1 : 3}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 px-6 pb-6 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isFirstGroup}
                    onClick={() => setCurrentGroupIndex((prev) => Math.max(0, prev - 1))}
                  >
                    Voltar
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      disabled={isLastGroup}
                      onClick={() => setCurrentGroupIndex((prev) => Math.min(questionGroups.length - 1, prev + 1))}
                    >
                      Proximo
                    </Button>
                    <Button type="submit" form="patient-form" disabled={isSaving || !isLastGroup} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isSaving ? "Salvando..." : "Salvar paciente e anamnese"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Editar paciente</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
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
                    placeholder="Ex.: Com conjuge e filhos"
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
                  className="w-full rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background control"
                  placeholder="Observacoes rapidas..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={closeEditModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isEditSaving}>
                  {isEditSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <div className="flex items-start gap-4">
              {modal.type === "success" && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              )}
              {modal.type === "error" && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
              )}
              {modal.type === "warning" && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
              )}
              {modal.type === "info" && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{modal.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{modal.message}</p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-full mt-6 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
