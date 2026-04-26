import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PatientMemoryRow = {
  patient_id: string;
  therapist_id: string;
  summary: string;
  updated_at: string;
};

/** Retorna o resumo clínico do paciente, ou null se ainda não existir. */
export async function getPatientMemory(params: {
  patientId: string;
  therapistId: string;
}): Promise<PatientMemoryRow | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("patient_memory")
    .select("patient_id, therapist_id, summary, updated_at")
    .eq("patient_id", params.patientId)
    .eq("therapist_id", params.therapistId)
    .maybeSingle();

  if (error) {
    // Falha silenciosa: memória não crítica para o fluxo principal
    console.error("[patientMemory] getPatientMemory error:", error.message);
    return null;
  }

  return data as PatientMemoryRow | null;
}

/** Upserta o resumo clínico do paciente. */
export async function upsertPatientMemory(params: {
  patientId: string;
  therapistId: string;
  summary: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("patient_memory").upsert(
    {
      patient_id: params.patientId,
      therapist_id: params.therapistId,
      summary: params.summary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "patient_id,therapist_id" },
  );

  if (error) {
    console.error("[patientMemory] upsertPatientMemory error:", error.message);
  }
}
