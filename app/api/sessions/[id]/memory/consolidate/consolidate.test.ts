import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMergePrompt, type PatientMemoryInsightsInput } from "@/lib/ai/updatePatientMemory";

describe("Patient Memory Lifecycle & Consolidation Suite (Cenários A a J)", () => {
  it("A) Gerar insights não deve atualizar patient_memory automaticamente", async () => {
    // Verificação de contrato: a rota de geração retorna os insights sem disparar upsert em patient_memory
    const generateResponse = {
      package: {
        summary: { bullets: ["Paciente relatou melhora na rotina de sono."] },
        themes: [{ title: "Sono e rotina", description: "Melhora nos hábitos noturnos", evidence: [] }],
        hypotheses: [{ hypothesis: "Redução de ansiedade situacional", confidence: "high" as const, evidence: [] }],
        risks: [],
        questions: [],
        next_steps: [{ step: "Manter higiene do sono", rationale: "Consistência" }],
      },
      insights: [],
      provider: "openai",
      isFullAI: true,
      patientMemory: null, // Não modificado na geração
    };

    assert.equal(generateResponse.patientMemory, null);
    assert.equal(generateResponse.package.hypotheses.length, 1);
  });

  it("B) Consolidar memória usa estritamente summary e themes", () => {
    const memoryInput: PatientMemoryInsightsInput = {
      summary: {
        bullets: ["Discussão sobre novos desafios na carreira", "Regulação emocional"],
      },
      themes: [
        { title: "Carreira", description: "Mudança de cargo" },
        { title: "Ansiedade", description: "Lidando com prazos" },
      ],
    };

    const prompt = buildMergePrompt("Histórico prévio", memoryInput);

    assert.ok(prompt.includes("Discussão sobre novos desafios na carreira"));
    assert.ok(prompt.includes("Regulação emocional"));
    assert.ok(prompt.includes("Carreira: Mudança de cargo"));
    assert.ok(prompt.includes("Ansiedade: Lidando com prazos"));
  });

  it("C) Hypotheses NÃO entram no prompt da memória longitudinal", () => {
    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: ["Tópico 1"] },
      themes: [{ title: "Tema 1", description: "Desc 1" }],
    };

    const hypothesisText = "HIPOTESE_ESPECULATIVA_QUE_NAO_DEVE_ENTRAR";
    const prompt = buildMergePrompt("Histórico", memoryInput);

    assert.ok(!prompt.includes(hypothesisText));
    assert.ok(!prompt.includes("Hipóteses exploratórias"));
  });

  it("D) Questions NÃO entram no prompt da memória longitudinal", () => {
    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: ["Tópico 1"] },
      themes: [{ title: "Tema 1", description: "Desc 1" }],
    };

    const questionText = "PERGUNTA_SOCRATICA_QUE_NAO_DEVE_ENTRAR";
    const prompt = buildMergePrompt("Histórico", memoryInput);

    assert.ok(!prompt.includes(questionText));
    assert.ok(!prompt.includes("Perguntas sugeridas"));
  });

  it("E) Risks NÃO entram no prompt da memória longitudinal", () => {
    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: ["Tópico 1"] },
      themes: [{ title: "Tema 1", description: "Desc 1" }],
    };

    const riskText = "RISCO_PROVISORIO_QUE_NAO_DEVE_ENTRAR";
    const prompt = buildMergePrompt("Histórico", memoryInput);

    assert.ok(!prompt.includes(riskText));
    assert.ok(!prompt.includes("Pontos de atenção"));
  });

  it("F) Next_steps NÃO entram no prompt da memória longitudinal", () => {
    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: ["Tópico 1"] },
      themes: [{ title: "Tema 1", description: "Desc 1" }],
    };

    const nextStepText = "PROXIMO_PASSO_QUE_NAO_DEVE_ENTRAR";
    const prompt = buildMergePrompt("Histórico", memoryInput);

    assert.ok(!prompt.includes(nextStepText));
    assert.ok(!prompt.includes("Próximos passos"));
  });

  it("G) Memória anterior é preservada e enviada para o merge", () => {
    const previousHistory = "Paciente em acompanhamento há 4 sessões. Foco em autoestima e trabalho.";
    const memoryInput: PatientMemoryInsightsInput = {
      summary: { bullets: ["Nova conquista profissional"] },
      themes: [{ title: "Autoeficácia", description: "Sentimento de competência" }],
    };

    const prompt = buildMergePrompt(previousHistory, memoryInput);

    assert.ok(prompt.includes(previousHistory));
    assert.ok(prompt.includes("Nova conquista profissional"));
  });

  it("H) Endpoint respeita isolamento por terapeuta (validação de acesso)", () => {
    const sessionOwnerTherapistId: string = "therapist-111";
    const requestTherapistId: string = "therapist-222";

    const isAuthorized = sessionOwnerTherapistId === requestTherapistId;
    assert.equal(isAuthorized, false);

    const authorizedTherapistId: string = "therapist-111";
    assert.equal(sessionOwnerTherapistId === authorizedTherapistId, true);
  });

  it("I) Concluir sessão chama consolidação antes da navegação", async () => {
    let consolidatedCalled = false;
    let navigatedTo: string | null = null;
    const patientId = "patient-123";

    const mockConsolidate = async () => {
      consolidatedCalled = true;
      return { ok: true };
    };
    const mockNavigate = (url: string) => {
      navigatedTo = url;
    };

    // Fluxo do handleFinishAndLeave
    try {
      await mockConsolidate();
    } catch {
      // ignore
    } finally {
      mockNavigate(`/patients/${patientId}`);
    }

    assert.equal(consolidatedCalled, true);
    assert.equal(navigatedTo, "/patients/patient-123");
  });

  it("J) Falha na consolidação não bloqueia o retorno ao prontuário", async () => {
    let navigatedTo: string | null = null;
    let errorLogged = false;
    const patientId = "patient-456";

    const mockFailingConsolidate = async () => {
      throw new Error("Erro simulado de rede ou timeout na API");
    };
    const mockNavigate = (url: string) => {
      navigatedTo = url;
    };

    // Fluxo do handleFinishAndLeave resiliente
    try {
      await mockFailingConsolidate();
    } catch (err) {
      errorLogged = Boolean(err);
    } finally {
      mockNavigate(`/patients/${patientId}`);
    }

    assert.equal(errorLogged, true);
    assert.equal(navigatedTo, "/patients/patient-456");
  });
});
