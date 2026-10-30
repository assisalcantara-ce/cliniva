import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";

/**
 * Obtém a chave OpenAI válida para o terapeuta.
 * 1. Prioriza a chave própria e criptografada do terapeuta (therapists.openai_api_key_encrypted).
 * 2. Em caso de ausência, utiliza a chave institucional da plataforma (process.env.OPENAI_API_KEY).
 * 3. Se nenhuma chave estiver configurada, lança exceção controlada.
 */
export async function getOpenAIKeyForTherapist(therapistId: string): Promise<{
  apiKey: string;
  keySource: "therapist" | "platform";
}> {
  const supabase = createSupabaseAdminClient();

  const { data: therapist } = await supabase
    .from("therapists")
    .select("openai_api_key_encrypted")
    .eq("id", therapistId)
    .maybeSingle();

  if (therapist?.openai_api_key_encrypted) {
    try {
      const decryptedKey = decryptOpenAiKey(therapist.openai_api_key_encrypted);
      if (decryptedKey && decryptedKey.startsWith("sk-")) {
        return {
          apiKey: decryptedKey,
          keySource: "therapist",
        };
      }
    } catch (e) {
      console.warn(`[getOpenAIKeyForTherapist] Falha ao descriptografar chave do terapeuta ${therapistId}:`, e);
    }
  }

  const platformKey = process.env.OPENAI_API_KEY;
  if (!platformKey) {
    throw new Error("Chave da API OpenAI não configurada no servidor (OPENAI_API_KEY)");
  }

  return {
    apiKey: platformKey,
    keySource: "platform",
  };
}
