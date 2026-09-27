import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const personalSchema = z.object({
  age: z.string().trim().optional(),
  birth_date: z.string().trim().min(1, "Data de nascimento é obrigatória").optional(),
  marital_status: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  email: z.string().trim().optional(),
  celular: z.string().trim().min(1, "Celular é obrigatório").optional(),
  profession: z.string().trim().optional(),
  education: z.string().trim().optional(),
  living_with: z.string().trim().optional(),
  has_children: z.string().trim().optional(),
  children_count: z.string().trim().optional(),
  children_ages: z.string().trim().optional(),
});

export const groupSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  answers: z.array(
    z.object({
      question: z.string().trim().min(1),
      answer: z.string().trim().optional(),
    })
  ),
});

export const putAnamnesisSchema = z
  .object({
    personal: personalSchema.optional(),
    groups: z.array(groupSchema).optional(),
  })
  .refine(
    (data) => Boolean(data.personal || data.groups),
    "É obrigatório fornecer ao menos 'personal' ou 'groups' para atualização da anamnese."
  );

export type PutAnamnesisInput = z.infer<typeof putAnamnesisSchema>;

export interface UpsertPatientAnamnesisParams {
  patientId: string;
  therapistId: string;
  data: PutAnamnesisInput;
  supabaseClient?: SupabaseClient;
}

export type UpsertAnamnesisResult =
  | { status: 200; anamnesis: Record<string, unknown> }
  | { status: 403; error: string }
  | { status: 404; error: string }
  | { status: 500; error: string };

/**
 * Função de domínio para salvar/atualizar Anamnese com:
 * 1. Isolamento estrito por patient_id + therapist_id
 * 2. Merge defensivo que preserva campos não enviados
 * 3. Compatibilidade com injeção de client para testes unitários e produção
 */
export async function upsertPatientAnamnesis(
  params: UpsertPatientAnamnesisParams
): Promise<UpsertAnamnesisResult> {
  const { patientId, therapistId, data, supabaseClient } = params;
  let client = supabaseClient;
  if (!client) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    client = createSupabaseAdminClient();
  }

  // 1. Verificar se o paciente existe e pertence ao terapeuta
  const { data: patient, error: patientError } = await client
    .from("patients")
    .select("id, therapist_id")
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) {
    return { status: 500, error: `Erro ao verificar paciente: ${patientError.message}` };
  }

  if (!patient) {
    return { status: 404, error: "Paciente não encontrado." };
  }

  if (patient.therapist_id !== therapistId) {
    return { status: 403, error: "Acesso negado: paciente não pertence ao terapeuta autenticado." };
  }

  // 2. Buscar anamnese existente para merge defensivo
  const { data: existingRecords, error: existingError } = await client
    .from("patient_anamnesis")
    .select("id, payload")
    .eq("patient_id", patientId)
    .eq("therapist_id", therapistId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    return { status: 500, error: `Erro ao consultar anamnese existente: ${existingError.message}` };
  }

  const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
  const existingPayload =
    existingRecord && typeof existingRecord.payload === "object" && existingRecord.payload !== null
      ? (existingRecord.payload as Record<string, unknown>)
      : {};

  // 3. Montar novo payload mesclando as partes preservadas
  const nextPayload: Record<string, unknown> = {
    ...existingPayload,
  };

  if (data.personal) {
    nextPayload.personal = {
      ...(typeof existingPayload.personal === "object" && existingPayload.personal !== null
        ? (existingPayload.personal as Record<string, unknown>)
        : {}),
      ...data.personal,
    };
  }

  if (data.groups) {
    nextPayload.groups = data.groups;
  }

  // 4. Salvar (update no registro existente ou insert se for o primeiro)
  let persistedPayload = nextPayload;

  if (existingRecord) {
    const { data: updated, error: updateError } = await client
      .from("patient_anamnesis")
      .update({ payload: nextPayload })
      .eq("id", existingRecord.id)
      .eq("therapist_id", therapistId)
      .select("payload")
      .single();

    if (updateError) {
      return { status: 500, error: `Erro ao atualizar anamnese: ${updateError.message}` };
    }
    persistedPayload = (updated?.payload as Record<string, unknown>) || nextPayload;
  } else {
    const { data: inserted, error: insertError } = await client
      .from("patient_anamnesis")
      .insert({
        patient_id: patientId,
        therapist_id: therapistId,
        payload: nextPayload,
      })
      .select("payload")
      .single();

    if (insertError) {
      return { status: 500, error: `Erro ao criar anamnese: ${insertError.message}` };
    }
    persistedPayload = (inserted?.payload as Record<string, unknown>) || nextPayload;
  }

  return { status: 200, anamnesis: persistedPayload };
}
