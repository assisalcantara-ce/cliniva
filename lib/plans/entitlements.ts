import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSafePlanDefinition, TRIAL_CONFIG, type PlanDefinition, type PlanFeature, type PlanId } from "./catalog";

export interface TherapistEntitlement {
  therapistId: string;
  planId: PlanId | null;
  planName: string;
  status: "active" | "trial" | "trial_expired" | "past_due" | "cancelled" | "inactive";
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  features: Record<PlanFeature, boolean>;
  canUseFeature: (feature: PlanFeature) => boolean;
}

function makeCanUseFeature(features: Record<PlanFeature, boolean>) {
  return (feature: PlanFeature): boolean => Boolean(features[feature]);
}

/**
 * Consulta e calcula os direitos de acesso (entitlements) de um terapeuta em tempo real.
 * 
 * Regras Éticas e Clínicas:
 * 1. Mesmo com trial expirado ou plano cancelado, 'clinical_management' e 'export_clinical_data'
 *    permanecem acessíveis (somente leitura de prontuários) para garantir compliance ético e LGPD.
 * 2. Recursos pagos avançados (áudio STT, IA corporativa, chat público) são bloqueados após a expiração.
 * 3. Expiração 100% autônoma no backend: compara timestamp trial_ends_at com NOW(), sem depender de cron jobs ou frontend.
 */
export async function getTherapistEntitlements(therapistId: string): Promise<TherapistEntitlement> {
  const supabase = createSupabaseAdminClient();

  // 1. Busca terapeuta e assinatura mais recente
  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, is_active, trial_used, trial_started_at")
    .eq("id", therapistId)
    .maybeSingle();

  if (!therapist) {
    return buildFallbackEntitlement(therapistId, "inactive");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan, status, is_trial, trial_started_at, trial_ends_at, features_override")
    .eq("therapist_id", therapistId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();

  // 2. Avaliação Autônoma de Período de Trial (Backend Driven)
  if (subscription?.is_trial && subscription.trial_ends_at) {
    const trialEnds = new Date(subscription.trial_ends_at);
    const msDiff = trialEnds.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    // Se o relógio do servidor ultrapassou a expiração do trial:
    if (now > trialEnds) {
      // Trial Expirou: Acesso clínico básico em modo somente leitura (proteção ao prontuário)
      const expiredFeatures: Record<PlanFeature, boolean> = {
        clinical_management: true,       // Leitura de prontuários e histórico
        session_manual_notes: false,      // Bloqueado para novas sessões
        corporate_ai_insights: false,     // Bloqueado
        realtime_audio_stt: false,        // Bloqueado
        copilot_live_suggestions: false,  // Bloqueado
        byok_openai: false,               // Bloqueado
        public_landing_page: false,       // Desativado
        public_chat_agent: false,         // Desativado
        public_slot_booking: false,       // Desativado
        export_clinical_data: true,       // Exportação de dados preservada (LGPD)
      };

      return {
        therapistId,
        planId: "profissional",
        planName: "Trial Profissional (Expirado)",
        status: "trial_expired",
        isTrial: true,
        trialEndsAt: subscription.trial_ends_at,
        trialDaysRemaining: 0,
        features: expiredFeatures,
        canUseFeature: makeCanUseFeature(expiredFeatures),
      };
    }

    // Trial Ativo (7 dias do Profissional)
    const basePlan = getSafePlanDefinition(TRIAL_CONFIG.basePlanId);
    const activeTrialFeatures = { ...basePlan.features };
    return {
      therapistId,
      planId: basePlan.id,
      planName: `${basePlan.name} (Trial)`,
      status: "trial",
      isTrial: true,
      trialEndsAt: subscription.trial_ends_at,
      trialDaysRemaining: daysRemaining,
      features: activeTrialFeatures,
      canUseFeature: makeCanUseFeature(activeTrialFeatures),
    };
  }

  // 3. Assinatura Regular Paga (Ativa)
  if (subscription && subscription.status === "active") {
    // getSafePlanDefinition garante que plano desconhecido NÃO herda privilégios do 'pro'
    const planDef = getSafePlanDefinition(subscription.plan);
    const featuresOverride = (subscription.features_override ?? {}) as Partial<Record<PlanFeature, boolean>>;
    const activeFeatures: Record<PlanFeature, boolean> = {
      ...planDef.features,
      ...featuresOverride,
    };

    return {
      therapistId,
      planId: planDef.id,
      planName: planDef.name,
      status: "active",
      isTrial: false,
      trialEndsAt: null,
      trialDaysRemaining: null,
      features: activeFeatures,
      canUseFeature: makeCanUseFeature(activeFeatures),
    };
  }

  // 4. Sem assinatura ativa ou cancelada
  const fallbackStatus = subscription?.status === "cancelled" ? "cancelled" : "inactive";
  return buildFallbackEntitlement(therapistId, fallbackStatus);
}

function buildFallbackEntitlement(
  therapistId: string,
  status: "active" | "trial" | "trial_expired" | "past_due" | "cancelled" | "inactive"
): TherapistEntitlement {
  const fallbackFeatures: Record<PlanFeature, boolean> = {
    clinical_management: true,      // Leitura de prontuários existente
    session_manual_notes: false,
    corporate_ai_insights: false,
    realtime_audio_stt: false,
    copilot_live_suggestions: false,
    byok_openai: false,
    public_landing_page: false,
    public_chat_agent: false,
    public_slot_booking: false,
    export_clinical_data: true,     // Exportação de dados (LGPD)
  };

  return {
    therapistId,
    planId: null,
    planName: "Sem Plano Ativo",
    status,
    isTrial: false,
    trialEndsAt: null,
    trialDaysRemaining: null,
    features: fallbackFeatures,
    canUseFeature: makeCanUseFeature(fallbackFeatures),
  };
}
