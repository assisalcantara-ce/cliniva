/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PUT } from "./route";
import { upsertPatientAnamnesis } from "@/lib/db/anamnesis";
import { createAuthToken } from "@/lib/auth";

// Fake Supabase Client para testes unitários de isolamento e persistência
function createMockSupabaseClient(store: {
  patients?: Array<Record<string, unknown>>;
  patient_anamnesis?: Array<Record<string, unknown>>;
}) {
  const patientAnamnesisStore = [...(store.patient_anamnesis ?? [])];
  const patientsStore = [...(store.patients ?? [])];

  return {
    from(tableName: string) {
      if (tableName === "patients") {
        let currentData = [...patientsStore];
        const builder: Record<string, unknown> = {
          select() {
            return builder;
          },
          eq(col: string, val: unknown) {
            currentData = currentData.filter((r) => r[col] === val);
            return builder;
          },
          async maybeSingle() {
            return { data: currentData[0] ?? null, error: null };
          },
        };
        return builder as any;
      }

      if (tableName === "patient_anamnesis") {
        let currentData = [...patientAnamnesisStore];
        let lastInsert: Record<string, unknown> | null = null;
        let lastUpdate: Record<string, unknown> | null = null;

        const builder: Record<string, unknown> = {
          select() {
            return builder;
          },
          eq(col: string, val: unknown) {
            currentData = currentData.filter((r) => r[col] === val);
            return builder;
          },
          order() {
            return builder;
          },
          limit(count: number) {
            currentData = currentData.slice(0, count);
            return builder;
          },
          insert(payloadRow: Record<string, unknown>) {
            lastInsert = { id: "new-anamnesis-id", ...payloadRow };
            patientAnamnesisStore.push(lastInsert);
            return builder;
          },
          update(updateFields: Record<string, unknown>) {
            lastUpdate = updateFields;
            if (currentData[0]) {
              Object.assign(currentData[0], updateFields);
            }
            return builder;
          },
          async single() {
            const returned = lastInsert || currentData[0] || lastUpdate;
            return { data: returned ?? null, error: null };
          },
          async then(resolve: (res: { data: unknown[]; error: null }) => void) {
            resolve({ data: currentData, error: null });
          },
        };
        return builder as any;
      }

      throw new Error(`Tabela não mockada: ${tableName}`);
    },
  } as any;
}

describe("PUT /api/patients/[id]/anamnesis & Domain Tests", () => {
  const therapistA = "therapist-uuid-1111";
  const therapistB = "therapist-uuid-2222";
  const patientId = "patient-uuid-9999";
  const otherPatientId = "patient-uuid-other";

  const samplePatient = {
    id: patientId,
    therapist_id: therapistA,
    full_name: "Maria Zilda Silva",
  };

  const sampleOtherPatient = {
    id: otherPatientId,
    therapist_id: therapistB,
    full_name: "Outro Paciente",
  };

  const samplePersonal = {
    age: "35",
    birth_date: "15/04/1991",
    marital_status: "Solteiro",
    cpf: "123.456.789-00",
    email: "paciente@email.com",
    celular: "(11) 98765-4321",
    profession: "Designer",
    education: "Superior Completo",
    living_with: "Sozinho",
    has_children: "nao",
  };

  const sampleGroups = [
    {
      id: "queixa-principal",
      title: "1. Queixa Principal e Motivo da Procura",
      answers: [
        {
          question: "O que trouxe você a terapia neste momento?",
          answer: "Ansiedade constante e insônia",
        },
      ],
    },
  ];

  it("1. Rejeita requisição sem token com 401", async () => {
    const req = new NextRequest(`http://localhost:3000/api/patients/${patientId}/anamnesis`, {
      method: "PUT",
      body: JSON.stringify({ personal: samplePersonal }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: patientId }) });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Não autenticado");
  });

  it("2. Rejeita payload vazio (sem personal e sem groups) com 400", async () => {
    process.env.AUTH_SECRET = "test-secret-123456789012345678901234567890";
    const token = createAuthToken({ userId: therapistA, email: "dr@teste.com" });
    const req = new NextRequest(`http://localhost:3000/api/patients/${patientId}/anamnesis`, {
      method: "PUT",
      headers: {
        Cookie: `auth_token=${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: patientId }) });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Payload inválido");
  });

  it("A) Criar anamnese nova com personal", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_anamnesis: [],
    });

    const result = await upsertPatientAnamnesis({
      patientId,
      therapistId: therapistA,
      data: { personal: samplePersonal },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 200);
    if (result.status === 200) {
      assert.deepEqual(result.anamnesis.personal, samplePersonal);
      assert.equal(result.anamnesis.groups, undefined);
    }
  });

  it("B) Atualizar somente groups (preservando personal existente)", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_anamnesis: [
        {
          id: "anamnesis-1",
          patient_id: patientId,
          therapist_id: therapistA,
          payload: { personal: samplePersonal },
        },
      ],
    });

    const result = await upsertPatientAnamnesis({
      patientId,
      therapistId: therapistA,
      data: { groups: sampleGroups },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 200);
    if (result.status === 200) {
      assert.deepEqual(result.anamnesis.personal, samplePersonal);
      assert.deepEqual(result.anamnesis.groups, sampleGroups);
    }
  });

  it("C) Atualizar somente personal (preservando groups existentes)", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_anamnesis: [
        {
          id: "anamnesis-1",
          patient_id: patientId,
          therapist_id: therapistA,
          payload: { personal: samplePersonal, groups: sampleGroups },
        },
      ],
    });

    const updatedPersonal = { ...samplePersonal, profession: "Psicólogo Clínico" };
    const result = await upsertPatientAnamnesis({
      patientId,
      therapistId: therapistA,
      data: { personal: updatedPersonal },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 200);
    if (result.status === 200) {
      assert.equal((result.anamnesis.personal as typeof samplePersonal).profession, "Psicólogo Clínico");
      assert.deepEqual(result.anamnesis.groups, sampleGroups);
    }
  });

  it("D) Atualizar personal + groups simultaneamente", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_anamnesis: [],
    });

    const result = await upsertPatientAnamnesis({
      patientId,
      therapistId: therapistA,
      data: { personal: samplePersonal, groups: sampleGroups },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 200);
    if (result.status === 200) {
      assert.deepEqual(result.anamnesis.personal, samplePersonal);
      assert.deepEqual(result.anamnesis.groups, sampleGroups);
    }
  });

  it("E) Retorna 404 para paciente inexistente", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [samplePatient],
      patient_anamnesis: [],
    });

    const result = await upsertPatientAnamnesis({
      patientId: "non-existent-id",
      therapistId: therapistA,
      data: { personal: samplePersonal },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 404);
  });

  it("F) Impede acesso e retorna 403 para paciente de outro terapeuta", async () => {
    const mockClient = createMockSupabaseClient({
      patients: [sampleOtherPatient],
      patient_anamnesis: [],
    });

    const result = await upsertPatientAnamnesis({
      patientId: otherPatientId,
      therapistId: therapistA, // Terapeuta A tentando acessar paciente do Terapeuta B
      data: { personal: samplePersonal },
      supabaseClient: mockClient,
    });

    assert.equal(result.status, 403);
  });
});
