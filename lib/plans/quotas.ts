import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type TherapistEntitlement } from "./entitlements";
import { getSafePlanDefinition } from "./catalog";

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  maxAllowed: number | null; // null = ilimitado
  period: string;
  error?: string;
}

/**
 * Retorna o período contábil e a franquia máxima oficial:
 * - 'trial_total' para terapeutas em período de teste gratuito de 7 dias (exatamente 5 análises no período todo).
 * - 'YYYY-MM' para assinantes regulares (exatamente 150 análises mensais nos planos Essencial, Premium e Profissional).
 * - null para clientes pioneiros do plano Pro Legado (ilimitado).
 * 
 * Regra de Segurança: Determinada e validada 100% pelo servidor backend, nunca aceitando valores enviados pelo cliente.
 */
export function getCorporateAiBillingPeriod(entitlement: TherapistEntitlement): {
  period: string;
  maxAllowed: number | null;
} {
  // Clientes do plano pioneiro Pro Legado têm franquia ilimitada
  if (entitlement.planId === "pro") {
    return {
      period: new Date().toISOString().slice(0, 7),
      maxAllowed: null,
    };
  }

  // 1. Trial de 7 dias: limite estrito de 5 análises durante TODO o período de teste
  if (entitlement.isTrial) {
    return {
      period: "trial_total",
      maxAllowed: 5,
    };
  }

  // 2. Planos regulares (Essencial, Premium, Profissional):
  // Franquia mensal de 150 análises básicas com a IA corporativa
  const planDef = getSafePlanDefinition(entitlement.planId ?? "essencial");
  const monthPeriod = new Date().toISOString().slice(0, 7);
  const maxAllowed = planDef.quotas.maxCorporateAiSessionsPerMonth ?? 150;

  return {
    period: monthPeriod,
    maxAllowed,
  };
}

/**
 * Consulta prévia não-bloqueante da cota de IA Corporativa (leitura).
 */
export async function checkCorporateAiQuota(params: {
  therapistId: string;
  entitlement: TherapistEntitlement;
}): Promise<QuotaCheckResult> {
  const { therapistId, entitlement } = params;
  const { period, maxAllowed } = getCorporateAiBillingPeriod(entitlement);

  if (maxAllowed === null) {
    return {
      allowed: true,
      currentUsage: 0,
      maxAllowed: null,
      period,
    };
  }

  const supabase = createSupabaseAdminClient();

  // 1. Tenta consultar a tabela de controle de cota (Migration 030)
  const { data: usageRow, error: usageError } = await supabase
    .from("therapist_corporate_ai_usage")
    .select("generations_count, max_allowed, is_quota_exceeded")
    .eq("therapist_id", therapistId)
    .eq("billing_period", period)
    .maybeSingle();

  if (!usageError && usageRow) {
    const currentUsage = usageRow.generations_count ?? 0;
    const allowed = !usageRow.is_quota_exceeded && currentUsage < maxAllowed;
    return {
      allowed,
      currentUsage,
      maxAllowed,
      period,
      error: allowed
        ? undefined
        : entitlement.isTrial
        ? `Limite do período de teste gratuito atingido (${currentUsage}/${maxAllowed} análises com IA). Assine um plano Cliniva para continuar.`
        : `Limite mensal da IA Corporativa atingido (${currentUsage}/${maxAllowed} análises neste mês). A franquia renovará no próximo mês.`,
    };
  }

  // 2. Fallback de contagem via session_insights
  let countQuery = supabase
    .from("session_insights")
    .select("id, sessions!inner(therapist_id)", { count: "exact", head: true })
    .eq("sessions.therapist_id", therapistId)
    .eq("kind", "themes");

  if (period !== "trial_total") {
    const monthStart = `${period}-01T00:00:00.000Z`;
    countQuery = countQuery.gte("created_at", monthStart);
  }

  const { count, error: countError } = await countQuery;
  const currentUsage = countError ? 0 : count ?? 0;
  const allowed = currentUsage < maxAllowed;

  return {
    allowed,
    currentUsage,
    maxAllowed,
    period,
    error: allowed
      ? undefined
      : entitlement.isTrial
      ? `Limite do período de teste gratuito atingido (${currentUsage}/${maxAllowed} análises com IA). Assine um plano Cliniva para continuar.`
      : `Limite mensal da IA Corporativa atingido (${currentUsage}/${maxAllowed} análises neste mês). A franquia renovará no próximo mês.`,
  };
}

/**
 * Reserva ATÔMICA e ANTECIPADA da quota de IA Corporativa antes da chamada à OpenAI.
 * - Bloqueia requisições concorrentes antes de chamar as APIs de geração (anti-race condition).
 * - Se a chamada à OpenAI falhar posteriormente, a função rollbackCorporateAiQuota pode ser usada para estorno.
 */
export async function reserveCorporateAiQuota(params: {
  therapistId: string;
  entitlement: TherapistEntitlement;
}): Promise<QuotaCheckResult> {
  const { therapistId, entitlement } = params;
  const { period, maxAllowed } = getCorporateAiBillingPeriod(entitlement);

  if (maxAllowed === null) {
    return {
      allowed: true,
      currentUsage: 0,
      maxAllowed: null,
      period,
    };
  }

  const supabase = createSupabaseAdminClient();

  // 1. Tenta a função atômica com FOR UPDATE no PostgreSQL (Migration 030)
  try {
    const { data, error } = await supabase.rpc("check_and_increment_corporate_ai_quota", {
      p_therapist_id: therapistId,
      p_billing_period: period,
      p_max_allowed: maxAllowed,
      p_increment: 1,
    });

    if (!error && data) {
      const allowed = Boolean(data.allowed);
      const currentUsage = Number(data.current_usage ?? 0);
      return {
        allowed,
        currentUsage,
        maxAllowed,
        period,
        error: allowed
          ? undefined
          : entitlement.isTrial
          ? `Limite do período de teste gratuito atingido (${currentUsage}/${maxAllowed} análises com IA). Assine um plano Cliniva para continuar.`
          : `Limite mensal da IA Corporativa atingido (${currentUsage}/${maxAllowed} análises neste mês). A franquia renovará no próximo mês.`,
      };
    }
  } catch (rpcErr) {
    // Segue para fallback se a migration ainda não foi executada
  }

  // 2. Fallback resiliente caso a RPC não esteja instalada no banco:
  const check = await checkCorporateAiQuota({ therapistId, entitlement });
  if (!check.allowed) {
    return check;
  }

  const newCount = check.currentUsage + 1;
  const isExceeded = newCount >= maxAllowed;

  try {
    await supabase
      .from("therapist_corporate_ai_usage")
      .upsert(
        {
          therapist_id: therapistId,
          billing_period: period,
          generations_count: newCount,
          max_allowed: maxAllowed,
          is_quota_exceeded: isExceeded,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "therapist_id,billing_period" }
      );
  } catch {
    // Falha silenciosa no fallback
  }

  return {
    allowed: true,
    currentUsage: newCount,
    maxAllowed,
    period,
  };
}

/**
 * Estorno atômico de quota caso a chamada à OpenAI ou a persistência falhe criticamente.
 */
export async function refundCorporateAiQuota(params: {
  therapistId: string;
  entitlement: TherapistEntitlement;
}): Promise<void> {
  const { therapistId, entitlement } = params;
  const { period, maxAllowed } = getCorporateAiBillingPeriod(entitlement);

  if (maxAllowed === null) return;

  const supabase = createSupabaseAdminClient();

  try {
    await supabase.rpc("check_and_increment_corporate_ai_quota", {
      p_therapist_id: therapistId,
      p_billing_period: period,
      p_max_allowed: maxAllowed,
      p_increment: -1,
    });
  } catch {
    // Falha silenciosa de estorno
  }
}
