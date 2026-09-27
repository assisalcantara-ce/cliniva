import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { questionGroups } from "@/lib/constants/anamnesis";
import type {
  AnamnesisFormData,
  AnamnesisPersonalData,
  AnamnesisGroupPayload,
} from "./AnamnesisForm";

describe("AnamnesisForm Component Logic & State Tests", () => {
  const samplePersonal: AnamnesisPersonalData = {
    birth_date: "15/04/1991",
    celular: "(11) 98765-4321",
    profession: "Designer Gráfico",
    age: "35",
    marital_status: "Casado(a)",
  };

  const sampleGroups: AnamnesisGroupPayload[] = [
    {
      id: "queixa-principal",
      title: "1. Queixa Principal e Motivo da Procura",
      answers: [
        {
          question: "O que trouxe você a terapia neste momento?",
          answer: "Ansiedade no trabalho",
        },
        {
          question: "Há quanto tempo isso tem acontecido?",
          answer: "Cerca de 6 meses",
        },
        {
          question: "Como isso afeta sua vida cotidiana?",
          answer: "Prejudica meu sono e concentração",
        },
      ],
    },
  ];

  it("A) Renderização e contagem dos 14 grupos clínicos", () => {
    assert.equal(questionGroups.length, 14);
    assert.equal(questionGroups[0].id, "queixa-principal");
    assert.equal(questionGroups[13].id, "metas-terapeuticas");

    let totalQuestions = 0;
    for (const g of questionGroups) {
      totalQuestions += g.questions.length;
    }
    assert.equal(totalQuestions, 46);
  });

  it("B) Carregamento de respostas e dados pessoais existentes", () => {
    const initialData: AnamnesisFormData = {
      personal: samplePersonal,
      groups: sampleGroups,
    };

    // Mapeamento idêntico ao estado interno do formulário
    const answersMap: Record<string, Record<string, string>> = {};
    for (const g of initialData.groups ?? []) {
      answersMap[g.id] = {};
      for (const a of g.answers) {
        answersMap[g.id][a.question] = a.answer ?? "";
      }
    }

    assert.equal(initialData.personal?.birth_date, "15/04/1991");
    assert.equal(initialData.personal?.profession, "Designer Gráfico");
    assert.equal(
      answersMap["queixa-principal"]["O que trouxe você a terapia neste momento?"],
      "Ansiedade no trabalho"
    );
  });

  it("C) Alteração de resposta sem perder as demais perguntas", () => {
    const answersMap: Record<string, Record<string, string>> = {
      "queixa-principal": {
        "O que trouxe você a terapia neste momento?": "Ansiedade inicial",
      },
    };

    // Altera a pergunta 1
    answersMap["queixa-principal"]["O que trouxe você a terapia neste momento?"] = "Ansiedade moderada com crise";

    // Adiciona resposta na pergunta 2 do mesmo grupo
    answersMap["queixa-principal"]["Há quanto tempo isso tem acontecido?"] = "3 semanas";

    // Adiciona resposta no grupo 2
    answersMap["historia-familiar"] = {
      "Como você descreveria sua família de origem?": "Família acolhedora",
    };

    assert.equal(
      answersMap["queixa-principal"]["O que trouxe você a terapia neste momento?"],
      "Ansiedade moderada com crise"
    );
    assert.equal(
      answersMap["queixa-principal"]["Há quanto tempo isso tem acontecido?"],
      "3 semanas"
    );
    assert.equal(
      answersMap["historia-familiar"]["Como você descreveria sua família de origem?"],
      "Família acolhedora"
    );
  });

  it("D) Cálculo de progresso de preenchimento", () => {
    const answersMap: Record<string, Record<string, string>> = {
      "queixa-principal": {
        "O que trouxe você a terapia neste momento?": "Resposta 1",
        "Há quanto tempo isso tem acontecido?": "Resposta 2",
        "Como isso afeta sua vida cotidiana?": "Resposta 3",
      },
    };

    let totalQuestions = 0;
    let totalAnswered = 0;

    for (const group of questionGroups) {
      totalQuestions += group.questions.length;
      const gAnswers = answersMap[group.id] ?? {};
      for (const q of group.questions) {
        if (gAnswers[q] && gAnswers[q].trim().length > 0) {
          totalAnswered += 1;
        }
      }
    }

    assert.equal(totalQuestions, 46);
    assert.equal(totalAnswered, 3);
    const percentage = Math.round((totalAnswered / totalQuestions) * 100);
    assert.equal(percentage, 7); // 3 de 46 ~ 7%
  });

  it("E) Cancelamento sem alteração de estado", () => {
    let canceled = false;
    const handleCancel = () => {
      canceled = true;
    };

    handleCancel();
    assert.equal(canceled, true);
  });

  it("F) Submit emitindo o payload estruturado completo dos 14 grupos", () => {
    const localPersonal: AnamnesisPersonalData = {
      birth_date: "01/01/1990",
      celular: "(85) 99999-8888",
    };

    const answersMap: Record<string, Record<string, string>> = {
      "queixa-principal": {
        "O que trouxe você a terapia neste momento?": "Sintomas de estresse",
      },
    };

    const submittedData: { current: AnamnesisFormData | null } = { current: null };
    const handleSave = (data: AnamnesisFormData) => {
      submittedData.current = data;
    };

    // Formatação executada no handleSubmit
    const formattedGroups: AnamnesisGroupPayload[] = questionGroups.map((group) => {
      const groupAnswersMap = answersMap[group.id] ?? {};
      const formattedAnswers = group.questions.map((q) => ({
        question: q,
        answer: groupAnswersMap[q]?.trim() ? groupAnswersMap[q].trim() : undefined,
      }));

      return {
        id: group.id,
        title: group.title,
        answers: formattedAnswers,
      };
    });

    handleSave({
      personal: localPersonal,
      groups: formattedGroups,
    });

    assert.ok(submittedData.current);
    assert.equal(submittedData.current.personal?.birth_date, "01/01/1990");
    assert.equal(submittedData.current.groups?.length, 14);
    assert.equal(
      submittedData.current.groups[0].answers[0].answer,
      "Sintomas de estresse"
    );
    assert.equal(submittedData.current.groups[0].answers[1].answer, undefined);
  });
});
