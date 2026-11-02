import { getTherapistOpenAiKey } from "@/lib/db/therapist";
import { getTherapistEntitlements, type TherapistEntitlement } from "@/lib/plans/entitlements";

export interface ResolvedAiKey {
  apiKey: string;
  source: "corporate" | "byok";
  planId: string;
}

/**
 * Finalidade do recurso de IA a ser invocado:
 * - 'basic_notes_analysis': Geração de insights, resumos, temas e hipóteses a partir de notas/transcrição da sessão.
 *   => NOS TRÊS PLANOS PAGOS (Essencial, Premium, Profissional), utiliza OBRIGATORIAMENTE a Chave Corporativa Cliniva
 *      com modelo econômico (gpt-4.1-mini) e franquia controlada.
 * - 'live_copilot': Copiloto clínico ao vivo (sugestões em tempo real durante a consulta).
 *   => Exige OBRIGATORIAMENTE chave BYOK nos planos Premium e Profissional.
 * - 'realtime_stt': Transcrição de áudio em tempo real via Whisper.
 *   => Exige OBRIGATORIAMENTE chave BYOK nos planos Premium e Profissional.
 */
export type AiFeaturePurpose = "basic_notes_analysis" | "live_copilot" | "realtime_stt";

/**
 * Resolve com segurança e isolamento estrito a chave OpenAI correta a ser utilizada.
 */
export async function resolveOpenAiKeyForSession(params: {
  therapistId: string;
  entitlement?: TherapistEntitlement;
  purpose?: AiFeaturePurpose;
}): Promise<ResolvedAiKey> {
  const entitlement =
    params.entitlement ?? (await getTherapistEntitlements(params.therapistId));
  const purpose = params.purpose ?? "basic_notes_analysis";

  // 1. Verificação de status do plano ou trial
  if (entitlement.status === "trial_expired") {
    throw new Error(
      "Seu período de teste gratuito de 7 dias expirou. Faça upgrade de plano para continuar utilizando os recursos avançados de IA."
    );
  }

  if (entitlement.status === "cancelled" || entitlement.status === "inactive") {
    throw new Error(
      "Sua assinatura Cliniva não está ativa. Ative seu plano para utilizar os recursos de inteligência artificial."
    );
  }

  // 2. Análise Básica de Notas Manuais / Sessão (generateInsights):
  // Nos três planos (Essencial, Premium, Profissional) e no Trial de 7 dias,
  // utiliza a Chave Corporativa Cliniva da plataforma, com modelo econômico e franquia.
  if (purpose === "basic_notes_analysis") {
    const corporateKey = process.env.OPENAI_API_KEY;
    if (!corporateKey || !corporateKey.startsWith("sk-")) {
      // Se não houver chave corporativa configurada, tenta chave BYOK como fallback seguro
      const { apiKey: byokKey } = await getTherapistOpenAiKey({ therapistId: params.therapistId });
      if (byokKey && byokKey.startsWith("sk-")) {
        return {
          apiKey: byokKey,
          source: "byok",
          planId: entitlement.planId ?? "premium",
        };
      }
      throw new Error(
        "Serviço de IA Corporativa temporariamente indisponível no servidor. Contate o suporte."
      );
    }

    return {
      apiKey: corporateKey,
      source: "corporate",
      planId: entitlement.planId ?? "essencial",
    };
  }

  // 3. Funções Avançadas: Transcrição de Áudio (realtime_stt) e Copiloto Clínico ao Vivo (live_copilot)
  // Nos planos Premium e Profissional, o uso de BYOK é obrigatório.
  if (purpose === "live_copilot" || purpose === "realtime_stt") {
    // Verifica permissão no plano
    const requiredFeature = purpose === "live_copilot" ? "copilot_live_suggestions" : "realtime_audio_stt";
    if (!entitlement.canUseFeature(requiredFeature)) {
      throw new Error(
        "Este recurso avançado de IA é exclusivo dos planos Premium e Profissional. Atualize seu plano para ter acesso."
      );
    }

    // Busca a chave individual cadastrada e criptografada do terapeuta
    const { apiKey: byokKey } = await getTherapistOpenAiKey({
      therapistId: params.therapistId,
    });

    if (byokKey && byokKey.startsWith("sk-")) {
      return {
        apiKey: byokKey,
        source: "byok",
        planId: entitlement.planId ?? "premium",
      };
    }

    // Durante o Trial ativo de 7 dias ou Plano Pro Legado:
    // Permite degustação com chave corporativa se o terapeuta ainda não adicionou sua chave
    if (entitlement.isTrial || entitlement.planId === "pro") {
      const corporateKey = process.env.OPENAI_API_KEY;
      if (corporateKey && corporateKey.startsWith("sk-")) {
        return {
          apiKey: corporateKey,
          source: "corporate",
          planId: entitlement.planId ?? "trial",
        };
      }
    }

    // No plano Premium e Profissional em produção, a chave BYOK é estritamente obrigatória
    throw new Error(
      "Chave OpenAI individual não configurada. Para transcrição de áudio e Copiloto ao vivo nos planos Premium/Profissional, acesse Configurações > IA e insira sua chave da OpenAI."
    );
  }

  throw new Error(`Finalidade de IA não reconhecida: ${purpose}`);
}
