import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas — ativado quando um pagamento é confirmado.
 *
 * Configurar no Asaas:
 *   URL: https://<seu-dominio>/api/webhook/asaas
 *   Token: valor de ASAAS_WEBHOOK_TOKEN (definido no painel Asaas)
 *
 * Validação: o Asaas envia o header `asaas-access-token` com o token
 * configurado no painel. Comparamos com ASAAS_WEBHOOK_TOKEN.
 */
export async function POST(req: NextRequest) {
  // ── Validar token do webhook ─────────────────────────────────────────────
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

  // Eventos que ativam a conta
  const ACTIVATING_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"] as const;
  const isActivating = (ACTIVATING_EVENTS as readonly string[]).includes(event);

  if (!isActivating) {
    // Eventos de inativação / reembolso
    if (event === "SUBSCRIPTION_INACTIVATED") {
      await handleSubscriptionInactivated(asaasSub?.id);
    }
    return NextResponse.json({ received: true });
  }

  // Para eventos de pagamento, precisamos do ID da assinatura Asaas
  const asaasSubscriptionId = payment?.subscription ?? asaasSub?.id;
  if (!asaasSubscriptionId) {
    return NextResponse.json({ received: true });
  }

  await activateAccount(asaasSubscriptionId);

  return NextResponse.json({ received: true });
}

async function activateAccount(asaasSubscriptionId: string) {
  const supabase = createSupabaseAdminClient();

  // 1. Encontrar invoice pelo external_id (= asaas subscription id)
  const { data: invoice, error: invoiceErr } = await supabase
    .from("invoices")
    .select("id, subscription_id")
    .eq("external_id", asaasSubscriptionId)
    .maybeSingle();

  if (invoiceErr || !invoice) {
    console.error("[webhook/asaas] invoice not found for:", asaasSubscriptionId, invoiceErr);
    return;
  }

  // 2. Atualizar invoice → paid
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoice.id);

  // 3. Atualizar subscription → active
  const { data: sub } = await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", invoice.subscription_id)
    .select("therapist_id")
    .single();

  if (!sub?.therapist_id) return;

  // 4. Ativar therapist e user
  await supabase
    .from("therapists")
    .update({ is_active: true })
    .eq("id", sub.therapist_id);

  await supabase
    .from("users")
    .update({ is_active: true })
    .eq("therapist_id", sub.therapist_id);

  console.log("[webhook/asaas] account activated for therapist:", sub.therapist_id);
}

async function handleSubscriptionInactivated(asaasSubscriptionId?: string) {
  if (!asaasSubscriptionId) return;
  const supabase = createSupabaseAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("subscription_id")
    .eq("external_id", asaasSubscriptionId)
    .maybeSingle();

  if (!invoice) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", invoice.subscription_id)
    .select("therapist_id")
    .single();

  if (!sub?.therapist_id) return;

  await supabase
    .from("therapists")
    .update({ is_active: false })
    .eq("id", sub.therapist_id);

  await supabase
    .from("users")
    .update({ is_active: false })
    .eq("therapist_id", sub.therapist_id);

  console.log("[webhook/asaas] account deactivated for therapist:", sub.therapist_id);
}
