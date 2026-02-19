import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_THERAPIST_DISPLAY_NAME = "Dra. Cristiane";

export type TherapistRow = {
  id: string;
  display_name: string;
  created_at?: string | null;
};

export async function getOrCreateTherapist(params?: {
  displayName?: string;
}): Promise<TherapistRow> {
  const displayName = params?.displayName ?? DEFAULT_THERAPIST_DISPLAY_NAME;
  const supabase = createSupabaseAdminClient();

  const findResult = await supabase
    .from("therapists")
    .select("id, display_name, created_at")
    .eq("display_name", displayName)
    .limit(1)
    .maybeSingle();

  if (findResult.error) {
    throw new Error(`Falha ao consultar terapeutas: ${findResult.error.message}`);
  }

  if (findResult.data) {
    return findResult.data as TherapistRow;
  }

  const insertResult = await supabase
    .from("therapists")
    .insert({ display_name: displayName })
    .select("id, display_name, created_at")
    .single();

  if (insertResult.error) {
    throw new Error(`Falha ao inserir terapeuta: ${insertResult.error.message}`);
  }

  return insertResult.data as TherapistRow;
}

export async function getOrCreateTherapistId(params?: {
  displayName?: string;
}): Promise<string> {
  const therapist = await getOrCreateTherapist(params);
  return therapist.id;
}
