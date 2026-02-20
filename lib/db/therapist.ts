import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";

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

export async function getTherapistOpenAiKey(params?: {
  therapistId?: string;
  displayName?: string;
}): Promise<{ apiKey?: string; last4?: string }> {
  const therapistId = params?.therapistId ?? (await getOrCreateTherapistId({ displayName: params?.displayName }));
  const supabase = createSupabaseAdminClient();

  const result = await supabase
    .from("therapists")
    .select("openai_api_key_encrypted, openai_api_key_last4, openai_api_key")
    .eq("id", therapistId)
    .single();

  if (result.error || !result.data) {
    return {};
  }

  const encrypted = result.data.openai_api_key_encrypted as string | null | undefined;
  const last4 = result.data.openai_api_key_last4 as string | null | undefined;
  const legacy = result.data.openai_api_key as string | null | undefined;

  if (encrypted) {
    return { apiKey: decryptOpenAiKey(encrypted), last4: last4 ?? encrypted.slice(-4) };
  }

  if (legacy) {
    return { apiKey: legacy, last4: legacy.slice(-4) };
  }

  return {};
}
