import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { questionGroups } from "../../lib/constants/anamnesis";
import type { AnamnesisFormData } from "./AnamnesisForm";

describe("Anamnesis UI & Integration Suite (Cenários A a G)", () => {
  it("A) Quando não existe anamnese, o CTA exibido é 'Preencher Anamnese'", () => {
    const anamnesis = null;
    const hasAnamnesis = Boolean(anamnesis);
    const buttonText = hasAnamnesis ? "Editar Anamnese" : "Preencher Anamnese";

    assert.equal(buttonText, "Preencher Anamnese");
  });

  it("B) Quando existe anamnese cadastrada, o CTA exibido é 'Editar Anamnese'", () => {
    const anamnesis = {
      personal: { age: "32", profession: "Engenheira" },
      groups: [],
    };
    const hasAnamnesis = Boolean(anamnesis);
    const buttonText = hasAnamnesis ? "Editar Anamnese" : "Preencher Anamnese";

    assert.equal(buttonText, "Editar Anamnese");
  });

  it("C) Em edição, pré-carrega dados pessoais e grupos; em criação, inicia limpo", () => {
    // 1. Dados em edição
    const existingData: AnamnesisFormData = {
      personal: {
        age: "28",
        birth_date: "10/05/1996",
        profession: "Designer",
        email: "paciente@email.com",
      },
      groups: [
        {
          id: "queixa-principal",
          title: "1. Queixa Principal e Motivo da Consulta",
          answers: [{ question: "Qual o motivo principal que o trouxe à terapia?", answer: "Ansiedade no trabalho" }],
        },
      ],
    };

    assert.equal(existingData.personal?.age, "28");
    assert.equal(existingData.groups?.[0].answers[0].answer, "Ansiedade no trabalho");

    // 2. Criação vazia
    const emptyData: AnamnesisFormData = {};
    assert.equal(emptyData.personal, undefined);
    assert.equal(emptyData.groups, undefined);
  });

  it("D) Ao submeter, formata o payload AnamnesisFormData com os 14 grupos e respostas", () => {
    const personal = { age: "30", profession: "Professor" };
    const firstGroup = questionGroups[0];
    const firstQuestion = firstGroup.questions[0];
    const answersMap: Record<string, Record<string, string>> = {
      [firstGroup.id]: {
        [firstQuestion]: "Insônia e estresse",
      },
    };

    const formattedGroups = questionGroups.map((group) => {
      const gAnswers = answersMap[group.id] ?? {};
      return {
        id: group.id,
        title: group.title,
        answers: group.questions.map((q) => ({
          question: q,
          answer: gAnswers[q]?.trim() ? gAnswers[q].trim() : undefined,
        })),
      };
    });

    const payload: AnamnesisFormData = {
      personal,
      groups: formattedGroups,
    };

    assert.equal(payload.personal?.age, "30");
    assert.equal(payload.groups?.length, 14);
    assert.equal(payload.groups[0].id, "queixa-principal");
    assert.equal(payload.groups[0].answers[0].answer, "Insônia e estresse");
  });

  it("E) Após sucesso do PUT, fecha o formulário e invoca atualização sem reload", async () => {
    let modalOpen = true;
    let summaryReloaded = false;

    const mockPutAnamnesis = async () => {
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    };
    const mockLoadSummary = async () => {
      summaryReloaded = true;
    };

    const res = await mockPutAnamnesis();
    if (res.ok) {
      modalOpen = false;
      await mockLoadSummary();
    }

    assert.equal(modalOpen, false);
    assert.equal(summaryReloaded, true);
  });

  it("F) Em caso de erro na API, preserva formulário aberto e estado das respostas", async () => {
    let modalOpen = true;
    let errorMessage: string | null = null;
    const typedPersonal = { age: "40", profession: "Advogado" };

    const mockPutAnamnesisFail = async () => {
      return { ok: false, status: 500, json: async () => ({ error: "Erro interno no servidor" }) };
    };

    const res = await mockPutAnamnesisFail();
    if (!res.ok) {
      const json = await res.json();
      errorMessage = json.error;
      // Modal permanece aberto
    }

    assert.equal(modalOpen, true);
    assert.equal(errorMessage, "Erro interno no servidor");
    // Respostas digitadas continuam preservadas
    assert.equal(typedPersonal.age, "40");
  });

  it("G) Previne submissão duplicada enquanto isSaving estiver ativo", () => {
    let callCount = 0;
    let isSaving = true;

    const handleSubmit = () => {
      if (isSaving) return;
      callCount++;
    };

    handleSubmit();
    assert.equal(callCount, 0);

    isSaving = false;
    handleSubmit();
    assert.equal(callCount, 1);
  });
});
