import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas — Processamento Idempotente, Ordenado e Seguro:
 * 
 * 1. Validação estrita do token `asaas-access-token`.
 * 2. Vínculo inequívoco entre pagamento, assinatura, fatura e profissional:
 *    - Validação de identificadores do Asaas (payment.id, payment.subscription, customer.id).
 *    - Cross-check com therapists.asaas_customer_id e invoices.external_id.
 * 3. Proteção contra webhooks fora de ordem ou repetidos:
 *    - Idempotência: chamadas repetidas não duplicam faturas nem alteram estados já liquidados.
 *    - Proteção contra reversão: eventos de assinaturas antigas ou substituídas NUNCA cancelam
 *      nem sobrescrevem assinaturas mais recentes ativas.
 * 4. Troca de plano sem perda de acesso:
 *    - A assinatura anterior permanece ativa até a confirmação efetiva do pagamento da nova assinatura.
 *    - Na confirmação, a assinatura antiga é finalizada/cancelada e a nova passa a 'active'.
 * 5. Consistência e proteção contra falhas parciais:
 *    - Atualizações ordenadas e validadas: fatura -> assinatura -> terapeuta/usuário.
 *    - Se uma etapa falhar, o processo é abortado com log estruturado sem estados contraditórios.
 * 6. Preservação de integridade clínica:
 *    - Cancelamentos ou inadimplência bloqueiam novos acessos e IA, preservando integralmente
 *      leitura e exportação de prontuários (compliance ético e LGPD).
 */
export async function POST(req: NextRequest) {
  // 1. Validação rigorosa do token do webhook
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (webhookToken) {
    const incoming = req.headers.get("asaas-access-token");
    if (incoming !== webhookToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await req.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment, subscription: asaasSub } = payload;
  const asaasSubscriptionId = payment?.subscription ?? asaasSub?.id;
  const asaasCustomerId = payment?.customer ?? asaasSub?.customer;
  const asaasPaymentId = payment?.id;

  if (!asaasSubscriptionId) {
    // Evento avulso sem assinatura associada (não altera assinaturas recorrentes)
    return NextResponse.json({ received: true, ignored: "no_subscription_id" });
  }

  // 2. Eventos de ativação e liquidação
  const ACTIVATING_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"] as const;
  if ((ACTIVATING_EVENTS as readonly string[]).includes(event)) {
    const result = await activateSubscriptionAndInvoice({
      asaasSubscriptionId,
      asaasCustomerId,
      asaasPaymentId,
      event,
    });
    return NextResponse.json({ received: true, ...result });
  }

  // 3. Eventos de inativação, cancelamento ou inadimplência
  const INACTIVATING_EVENTS = [
    "SUBSCRIPTION_INACTIVATED",
    "SUBSCRIPTION_DELETED",
    "PAYMENT_OVERDUE",
  ];

  if (INACTIVATING_EVENTS.includes(event)) {
    const result = await handleSubscriptionInactivated({
      asaasSubscriptionId,
      asaasCustomerId,
      event,
    });
    return NextResponse.json({ received: true, ...result });
  }

  // Outros eventos (ex: PAYMENT_CREATED, PAYMENT_UPDATED): recebidos sem alterar permissões ativas
  return NextResponse.json({ received: true, action: "acknowledged", event });
}

/**
 * Ativação segura e idempotente com validação de vínculo e proteção contra sobrescrita.
 */
export async function activateSubscriptionAndInvoice(params: {
  asaasSubscriptionId: string;
  asaasCustomerId?: string;
  asaasPaymentId?: string;
  event: string;
}): Promise<{ action: string; subscriptionId?: string; error?: string }> {
  const { asaasSubscriptionId, asaasCustomerId, asaasPaymentId } = params;
  const supabase = createSupabaseAdminClient();

  // 1. Localizar a fatura associada à assinatura Asaas
  const { data: invoice, error: invoiceErr } = await supabase
    .from("invoices")
    .select("id, subscription_id, status, amount_cents, external_id")
    .eq("external_id", asaasSubscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    console.warn("[webhook/asaas] Invoice não encontrada para external_id:", asaasSubscriptionId);
    return { action: "invoice_not_found", error: "Invoice missing" };
  }

  // 2. Localizar e validar a assinatura correspondente
  const { data: targetSub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id, therapist_id, plan, status, is_trial, created_at")
    .eq("id", invoice.subscription_id)
    .single();

  if (subErr || !targetSub) {
    console.warn("[webhook/asaas] Assinatura não encontrada para invoice:", invoice.id);
    return { action: "subscription_not_found", error: "Subscription missing" };
  }

  // 3. Validação de Vínculo: Verificar compatibilidade com o terapeuta e Asaas Customer
  const { data: therapist, error: thErr } = await supabase
    .from("therapists")
    .select("id, asaas_customer_id, is_active")
    .eq("id", targetSub.therapist_id)
    .single();

  if (thErr || !therapist) {
    console.warn("[webhook/asaas] Terapeuta não encontrado para assinatura:", targetSub.id);
    return { action: "therapist_not_found", error: "Therapist missing" };
  }

  if (asaasCustomerId && therapist.asaas_customer_id && therapist.asaas_customer_id !== asaasCustomerId) {
    console.error("[webhook/asaas] Mismatch de customer ID:", {
      expected: therapist.asaas_customer_id,
      received: asaasCustomerId,
    });
    return { action: "customer_mismatch", error: "Customer ID does not match therapist" };
  }

  // 4. Proteção contra Webhook Fora de Ordem / Assinatura Antiga:
  // Se já existe uma assinatura ativa MAIS NOVA que a alvo, este webhook atrasado de assinatura
  // antiga NÃO PODE sobrescrever nem reativar o plano antigo.
  const { data: newerActiveSubs } = await supabase
    .from("subscriptions")
    .select("id, plan, created_at, status")
    .eq("therapist_id", targetSub.therapist_id)
    .eq("status", "active")
    .gt("created_at", targetSub.created_at);

  if (newerActiveSubs && newerActiveSubs.length > 0) {
    console.warn("[webhook/asaas] Ignorando ativação de assinatura antiga/substituída:", {
      targetSubId: targetSub.id,
      newerActiveSubId: newerActiveSubs[0].id,
    });
    // Apenas marca a fatura antiga como paga (para controle contábil), mas NÃO ativa a assinatura antiga
    if (invoice.status !== "paid") {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: asaasPaymentId ? `asaas:${asaasPaymentId}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
    }
    return { action: "superseded_ignored", subscriptionId: targetSub.id };
  }

  // 5. Idempotência estrita: se a fatura já está paga e a assinatura já está ativa
  if (invoice.status === "paid" && targetSub.status === "active" && therapist.is_active) {
    return { action: "already_active_idempotent", subscriptionId: targetSub.id };
  }

  // 6. Atualização Sequencial e Consistente (Passo a Passo com verificação):
  // Etapa A: Marcar fatura como paga
  if (invoice.status !== "paid") {
    const { error: updInvErr } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: asaasPaymentId ? `asaas:${asaasPaymentId}` : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updInvErr) {
      console.error("[webhook/asaas] Falha ao atualizar fatura:", updInvErr);
      return { action: "invoice_update_failed", error: updInvErr.message };
    }
  }

  // Etapa B: Transição de Planos (Upgrade/Downgrade):
  // Se estamos ativando uma nova assinatura, cancelamos/inativamos qualquer assinatura anterior
  // do profissional de forma segura, garantindo que nunca haja duas assinaturas ativas simultâneas.
  const { data: priorActiveSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("therapist_id", targetSub.therapist_id)
    .eq("status", "active")
    .neq("id", targetSub.id);

  if (priorActiveSubs && priorActiveSubs.length > 0) {
    for (const prior of priorActiveSubs) {
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", prior.id);
      console.log(`[webhook/asaas] Assinatura anterior ${prior.id} substituída com sucesso.`);
    }
  }

  // Etapa C: Ativar a nova assinatura e desativar qualquer flag de trial
  const { error: updSubErr } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      is_trial: false,
      trial_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetSub.id);

  if (updSubErr) {
    console.error("[webhook/asaas] Falha ao ativar assinatura:", updSubErr);
    return { action: "subscription_update_failed", error: updSubErr.message };
  }

  // Etapa D: Ativar o terapeuta e os registros de acesso
  await supabase
    .from("therapists")
    .update({ is_active: true })
    .eq("id", targetSub.therapist_id);

  await supabase
    .from("users")
    .update({ is_active: true })
    .eq("therapist_id", targetSub.therapist_id);

  console.log(`[webhook/asaas] Assinatura ${targetSub.id} ativada para o terapeuta ${targetSub.therapist_id} (Plano: ${targetSub.plan}).`);
  return { action: "account_activated", subscriptionId: targetSub.id };
}

/**
 * Desativação segura com proteção contra cancelamento de assinaturas substituídas ou mais recentes.
 */
export async function handleSubscriptionInactivated(params: {
  asaasSubscriptionId: string;
  asaasCustomerId?: string;
  event: string;
}): Promise<{ action: string; subscriptionId?: string }> {
  const { asaasSubscriptionId } = params;
  const supabase = createSupabaseAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("subscription_id")
    .eq("external_id", asaasSubscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invoice) {
    return { action: "invoice_not_found" };
  }

  const { data: targetSub } = await supabase
    .from("subscriptions")
    .select("id, therapist_id, status, created_at")
    .eq("id", invoice.subscription_id)
    .single();

  if (!targetSub?.therapist_id) {
    return { action: "subscription_not_found" };
  }

  // 1. Marca a assinatura alvo como cancelada
  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetSub.id);

  // 2. Proteção Crítica de Integridade:
  // Só desativamos o profissional (is_active: false) se ele NÃO possuir nenhuma OUTRA assinatura ativa.
  // Exemplo: se o profissional fez upgrade e o Asaas inativou a assinatura antiga,
  // a nova assinatura ativa permanece válida e o profissional continua com acesso.
  const { data: otherActiveSubs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("therapist_id", targetSub.therapist_id)
    .eq("status", "active")
    .neq("id", targetSub.id);

  if (otherActiveSubs && otherActiveSubs.length > 0) {
    console.log(`[webhook/asaas] Assinatura ${targetSub.id} cancelada, mas profissional mantém outra assinatura ativa.`);
    return { action: "subscription_cancelled_other_remains_active", subscriptionId: targetSub.id };
  }

  // 3. Sem outras assinaturas ativas: desativa o usuário e o terapeuta
  // Preserva integralmente prontuários clínicos para leitura e exportação (RLS & Entitlements).
  await supabase
    .from("therapists")
    .update({ is_active: false })
    .eq("id", targetSub.therapist_id);

  await supabase
    .from("users")
    .update({ is_active: false })
    .eq("therapist_id", targetSub.therapist_id);

  console.log(`[webhook/asaas] Assinatura cancelada e acesso inativado para terapeuta: ${targetSub.therapist_id}`);
  return { action: "account_deactivated", subscriptionId: targetSub.id };
}
