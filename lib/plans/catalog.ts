import { z } from "zod";

/**
 * Identificadores canônicos dos novos planos comerciais e legado.
 */
export const PlanIdSchema = z.enum([
  "essencial",
  "premium",
  "profissional",
  // Planos legados preservados integralmente
  "pro",
  "basic",
  "enterprise",
]);

export type PlanId = z.infer<typeof PlanIdSchema>;

/**
 * Recursos (features) controláveis por plano.
 */
export type PlanFeature =
  | "clinical_management"      // Prontuário, anotações de sessão, anamnese
  | "session_manual_notes"     // Digitação de notas durante/após a sessão
  | "corporate_ai_insights"    // Resumos e insights clínicos via IA Corporativa Cliniva
  | "realtime_audio_stt"       // Transcrição de áudio em tempo real (Whisper/STT)
  | "copilot_live_suggestions" // Copiloto com sugestões ao vivo durante a sessão
  | "byok_openai"              // Suporte a chave OpenAI própria do terapeuta
  | "public_landing_page"      // Página pública personalizada do profissional (/p/[slug])
  | "public_chat_agent"        // Widget universal com IA Corporativa na landing
  | "public_slot_booking"      // Consulta e agendamento automático de horários na agenda
  | "export_clinical_data";    // Exportação irrestrita de prontuários e dados (LGPD)

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceCents: number;
  priceFormatted: string;
  description: string;
  isPubliclyAvailable: boolean;
  features: Record<PlanFeature, boolean>;
  quotas: {
    maxCorporateAiSessionsPerMonth: number | null; // null = ilimitado
    maxPublicChatConversationsPerMonth: number | null;
  };
}

/**
 * Catálogo centralizado oficial de planos Cliniva.
 */
export const PLANS_CATALOG: Record<PlanId, PlanDefinition> = {
  essencial: {
    id: "essencial",
    name: "Cliniva Essencial",
    priceCents: 5990,
    priceFormatted: "R$ 59,90",
    description: "Gestão clínica completa, notas manuais e análises com IA corporativa Cliniva.",
    isPubliclyAvailable: true,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: false,
      copilot_live_suggestions: false,
      byok_openai: false,
      public_landing_page: false,
      public_chat_agent: false,
      public_slot_booking: false,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: 150,
      maxPublicChatConversationsPerMonth: 0,
    },
  },

  premium: {
    id: "premium",
    name: "Cliniva Premium",
    priceCents: 9990,
    priceFormatted: "R$ 99,90",
    description: "Tudo do Essencial, mais transcrição de áudio em tempo real e Copiloto avançado com chave própria.",
    isPubliclyAvailable: true,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: true,
      copilot_live_suggestions: true,
      byok_openai: true,
      public_landing_page: false,
      public_chat_agent: false,
      public_slot_booking: false,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: null, // Ilimitado na chave BYOK
      maxPublicChatConversationsPerMonth: 0,
    },
  },

  profissional: {
    id: "profissional",
    name: "Cliniva Profissional",
    priceCents: 19990,
    priceFormatted: "R$ 199,90",
    description: "Tudo do Premium, mais página pública personalizada, chat com IA corporativa e agendamento automático.",
    isPubliclyAvailable: true,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: true,
      copilot_live_suggestions: true,
      byok_openai: true,
      public_landing_page: true,
      public_chat_agent: true,
      public_slot_booking: true,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: null,
      maxPublicChatConversationsPerMonth: 500,
    },
  },

  // ── Planos legados (preservam todos os recursos para clientes existentes) ──
  pro: {
    id: "pro",
    name: "Cliniva Pro (Legado)",
    priceCents: 29990,
    priceFormatted: "R$ 299,90",
    description: "Plano fundador pioneiro com todos os recursos habilitados.",
    isPubliclyAvailable: false,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: true,
      copilot_live_suggestions: true,
      byok_openai: true,
      public_landing_page: true,
      public_chat_agent: true,
      public_slot_booking: true,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: null,
      maxPublicChatConversationsPerMonth: null,
    },
  },

  basic: {
    id: "basic",
    name: "Cliniva Basic (Legado)",
    priceCents: 9900,
    priceFormatted: "R$ 99,00",
    description: "Plano básico legado.",
    isPubliclyAvailable: false,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: false,
      copilot_live_suggestions: false,
      byok_openai: true,
      public_landing_page: false,
      public_chat_agent: false,
      public_slot_booking: false,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: 50,
      maxPublicChatConversationsPerMonth: 0,
    },
  },

  enterprise: {
    id: "enterprise",
    name: "Cliniva Enterprise (Legado)",
    priceCents: 99900,
    priceFormatted: "R$ 999,00",
    description: "Plano empresarial para clínicas multidisciplinares.",
    isPubliclyAvailable: false,
    features: {
      clinical_management: true,
      session_manual_notes: true,
      corporate_ai_insights: true,
      realtime_audio_stt: true,
      copilot_live_suggestions: true,
      byok_openai: true,
      public_landing_page: true,
      public_chat_agent: true,
      public_slot_booking: true,
      export_clinical_data: true,
    },
    quotas: {
      maxCorporateAiSessionsPerMonth: null,
      maxPublicChatConversationsPerMonth: null,
    },
  },
};

/**
 * Configuração e limites do período de testes (Trial).
 */
export const TRIAL_CONFIG = {
  durationDays: 7,
  basePlanId: "profissional" as PlanId,
  quotas: {
    maxCorporateAiSessions: 5,
    maxPublicChatConversations: 50,
  },
};

/**
 * Retorna os detalhes de um plano pelo ID.
 * SEGURANÇA E PRINCÍPIO DO MENOR PRIVILÉGIO:
 * Se um ID for desconhecido, inválido ou ausente, NUNCA concede permissões do 'pro'.
 * Retorna undefined ou plano seguro de privilégio mínimo ('essencial').
 */
export function getPlanDefinition(planId: string): PlanDefinition | null {
  const parsed = PlanIdSchema.safeParse(planId);
  if (parsed.success && PLANS_CATALOG[parsed.data]) {
    return PLANS_CATALOG[parsed.data];
  }
  return null;
}

/**
 * Retorna a definição com fallback estritamente restritivo para 'essencial' (menor privilégio),
 * nunca concedendo acesso indevido ao 'pro' legado.
 */
export function getSafePlanDefinition(planId: string): PlanDefinition {
  const def = getPlanDefinition(planId);
  if (def) return def;
  return PLANS_CATALOG.essencial;
}
