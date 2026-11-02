import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptOpenAiKey } from "@/lib/ai/openaiKey";

/**
 * Obtém a chave OpenAI corporativa da Cliniva para o chat público.
 * O chat público na página profissional (/p/[slug]) e nas landing pages parceiras
 * utiliza exclusivamente a chave corporativa Cliniva (process.env.OPENAI_API_KEY),
 * nunca consumindo a cota pessoal nem expondo a chave individual BYOK do profissional.
 */
export async function getOpenAIKeyForTherapist(_therapistId: string): Promise<{
  apiKey: string;
  keySource: "platform";
}> {
  const platformKey = process.env.OPENAI_API_KEY;
  if (!platformKey || !platformKey.startsWith("sk-")) {
    throw new Error("Chave da API OpenAI corporativa não configurada no servidor (OPENAI_API_KEY)");
  }

  return {
    apiKey: platformKey,
    keySource: "platform",
  };
}
