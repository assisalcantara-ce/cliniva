import { NextRequest, NextResponse } from "next/server";
import { getTherapistIdFromRequest, authError } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTherapistEntitlements } from "@/lib/plans/entitlements";
import { getSafePlanDefinition, PLANS_CATALOG } from "@/lib/plans/catalog";
import { checkCorporateAiQuota } from "@/lib/plans/quotas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/subscription
 * Retorna os detalhes da assinatura atual do profissional:
 * - Plano atual, status, preço e recursos
 * - Dados de trial (se ativo, expirado ou elegível)
 * - Histórico de faturas / pagamentos
 * - Consumo de IA no mês
 */
export async function GET(req: NextRequest) {
  let therapistId: string;
  try {
    therapistId = getTherapistIdFromRequest(req);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "UNAUTHENTICATED";
    const { error, status } = authError(code);
    return NextResponse.json({ error }, { status });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // 1. Consulta Entitlements em tempo real (autônomo contra expiração)
    const entitlement = await getTherapistEntitlements(therapistId);
    const planDef = getSafePlanDefinition(entitlement.planId ?? "essencial");

    // 2. Consulta consumo de IA corporativa
    const quota = await checkCorporateAiQuota({ therapistId, entitlement });

    // 3. Consulta assinatura no banco
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, plan, status, billing_cycle, amount_cents, next_billing_date, is_trial, trial_started_at, trial_ends_at, created_at")
      .eq("therapist_id", therapistId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Consulta faturas
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, amount_cents, status, due_date, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      subscription: {
        planId: entitlement.planId,
        planName: entitlement.planName,
        status: entitlement.status,
        priceFormatted: planDef.priceFormatted,
        isTrial: entitlement.isTrial,
        trialEndsAt: entitlement.trialEndsAt,
        trialDaysRemaining: entitlement.trialDaysRemaining,
        nextBillingDate: subscription?.next_billing_date || null,
        features: entitlement.features,
      },
      quota: {
        currentUsage: quota.currentUsage,
        maxAllowed: quota.maxAllowed,
        period: quota.period,
      },
      invoices: invoices ?? [],
      availablePlans: [
        PLANS_CATALOG.essencial,
        PLANS_CATALOG.premium,
        PLANS_CATALOG.profissional,
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
