import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TRIAL_CONFIG } from "./catalog";

export interface StartTrialResult {
  success: boolean;
  trialEndsAt?: string;
  error?: string;
  alreadyUsed?: boolean;
}

/**
 * Inicia o período de testes gratuito de 7 dias para um profissional.
 * 
 * Regras de Segurança e Integridade:
 * 1. Verifica se o profissional já utilizou o trial no passado (`trial_used === true`).
 *    Se já usou, recusa imediatamente sem gerar nova assinatura trial.
 * 2. Proteção contra reativação indevida: se o profissional já possui assinatura ativa paga ('active'), não rebaixa nem substitui por trial.
 * 3. Operação atômica / idempotente com lock condicional no banco: impede que requisições concorrentes criem dois trials para a mesma conta.
 * 4. Ativa imediatamente o terapeuta (`is_active: true`) e o usuário para permitir acesso instantâneo sem cartão de crédito.
 */
export async function startFreeTrial(therapistId: string): Promise<StartTrialResult> {
  const supabase = createSupabaseAdminClient();

  // 1. Busca terapeuta e verifica histórico de trial
  const { data: therapist, error: therapistErr } = await supabase
    .from("therapists")
    .select("id, is_active, trial_used, trial_started_at")
    .eq("id", therapistId)
    .maybeSingle();

  if (therapistErr || !therapist) {
    return {
      success: false,
      error: "Profissional não encontrado para ativação do trial.",
    };
  }

  // 2. Proteção Anti-Abuso: Impede múltiplos testes gratuitos por conta
  if (therapist.trial_used) {
    return {
      success: false,
      alreadyUsed: true,
      error: "O período de teste gratuito de 7 dias já foi utilizado para este profissional.",
    };
  }

  // 3. Verifica se o profissional já possui assinatura paga ativa (não rebaixa cliente pago para trial)
  const { data: activePaidSub } = await supabase
    .from("subscriptions")
    .select("id, plan, status, is_trial")
    .eq("therapist_id", therapistId)
    .eq("status", "active")
    .eq("is_trial", false)
    .limit(1)
    .maybeSingle();

  if (activePaidSub) {
    return {
      success: false,
      error: "O profissional já possui uma assinatura comercial ativa e não necessita de período de teste.",
    };
  }

  // 4. Verifica se já existe um trial ativo em andamento (idempotência)
  const { data: existingTrial } = await supabase
    .from("subscriptions")
    .select("id, is_trial, trial_ends_at, status")
    .eq("therapist_id", therapistId)
    .eq("is_trial", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTrial && existingTrial.trial_ends_at) {
    const trialEnds = new Date(existingTrial.trial_ends_at);
    if (trialEnds > new Date()) {
      // Já está em trial ativo
      return {
        success: true,
        trialEndsAt: existingTrial.trial_ends_at,
      };
    }
  }

  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);
  const trialStartedAtIso = now.toISOString();
  const trialEndsAtIso = trialEnds.toISOString();

  // 5. Atualização atômica condicional: só marca se trial_used ainda for false (proteção anti-race condition)
  const { data: updatedTherapist, error: updateErr } = await supabase
    .from("therapists")
    .update({
      trial_used: true,
      trial_started_at: trialStartedAtIso,
      is_active: true, // Ativação imediata para degustação
    })
    .eq("id", therapistId)
    .eq("trial_used", false)
    .select("id")
    .maybeSingle();

  if (updateErr || !updatedTherapist) {
    return {
      success: false,
      alreadyUsed: true,
      error: "Tentativa concorrente detectada ou teste gratuito já ativado anteriormente.",
    };
  }

  // 6. Ativa o usuário correspondente no sistema de login
  await supabase
    .from("users")
    .update({ is_active: true })
    .eq("therapist_id", therapistId);

  // 7. Insere assinatura trial vinculada ao plano Profissional
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      therapist_id: therapistId,
      plan: TRIAL_CONFIG.basePlanId,
      status: "active",
      billing_cycle: "monthly",
      amount_cents: 0, // Gratuito no período de teste
      is_trial: true,
      trial_started_at: trialStartedAtIso,
      trial_ends_at: trialEndsAtIso,
      next_billing_date: trialEndsAtIso.split("T")[0],
    })
    .select("id, trial_ends_at")
    .single();

  if (subErr || !sub) {
    return {
      success: false,
      error: `Falha ao registrar assinatura de teste: ${subErr?.message ?? "Erro desconhecido"}`,
    };
  }

  return {
    success: true,
    trialEndsAt: sub.trial_ends_at ?? trialEndsAtIso,
  };
}
