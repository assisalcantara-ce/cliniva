import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getPixQrCode,
  BillingType,
  asaasGet,
} from "@/lib/asaas";
import { getSafePlanDefinition } from "@/lib/plans/catalog";
import { parseAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Schemas ────────────────────────────────────────────────────────────────

const creditCardSchema = z.object({
  holderName: z.string().trim().min(2),
  number: z.string().regex(/^\d{13,19}$/, "Número de cartão inválido"),
  expiryMonth: z.string().regex(/^\d{2}$/, "Mês inválido"),
  expiryYear: z.string().regex(/^\d{4}$/, "Ano inválido"),
  ccv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
});

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos (sem pontos/traços)"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
  password: z.string().min(8, "Senha mínima de 8 caracteres").optional(),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
  planId: z.enum(["essencial", "premium", "profissional"]).optional().default("profissional"),
  card: creditCardSchema.optional(),
});

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, cpf, phone, password, billingType, planId, card } = parsed.data;

    // Resolução do plano pelo catálogo centralizado oficial
    const selectedPlan = getSafePlanDefinition(planId);
    const planPriceReais = selectedPlan.priceCents / 100;
    const planName = selectedPlan.name;

    // Cartão requer dados do cartão
    if (billingType === "CREDIT_CARD" && !card) {
      return NextResponse.json(
        { error: "Dados do cartão são obrigatórios para pagamento via cartão de crédito." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // ── 1. Verificar se o terapeuta já existe (Troca de Plano ou Novo Cadastro) ─
    const authToken = req.cookies.get("auth_token")?.value;
    const sessionUser = authToken ? parseAuthToken(authToken) : null;

    const { data: existingTherapist } = await supabase
      .from("therapists")
      .select("id, email, asaas_customer_id, is_active")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    let therapistId: string;
    let asaasCustomerId: string;

    if (existingTherapist) {
      // Caso 1: Usuário autenticado alterando/assinando plano
      // OU terapeuta que informou a senha correta
      let isAuthorized = false;
      if (sessionUser && sessionUser.userId === existingTherapist.id) {
        isAuthorized = true;
      } else if (password) {
        // Valida senha do usuário cadastrado
        const { data: userRecord } = await supabase
          .from("users")
          .select("password_hash")
          .eq("therapist_id", existingTherapist.id)
          .maybeSingle();

        if (userRecord?.password_hash) {
          isAuthorized = await bcrypt.compare(password, userRecord.password_hash);
        }
      }

      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Este email já está cadastrado. Faça login para alterar seu plano ou informe sua senha atual." },
          { status: 409 }
        );
      }

      therapistId = existingTherapist.id;

      // Recupera ou cria cliente Asaas caso não exista ainda
      if (existingTherapist.asaas_customer_id) {
        asaasCustomerId = existingTherapist.asaas_customer_id;
      } else {
        const newCustomer = await createAsaasCustomer({
          name,
          email,
          cpfCnpj: cpf,
          mobilePhone: phone,
        });
        asaasCustomerId = newCustomer.id;
        await supabase
          .from("therapists")
          .update({ asaas_customer_id: asaasCustomerId })
          .eq("id", therapistId);
      }
    } else {
      // Caso 2: Novo cadastro profissional (requer senha)
      if (!password) {
        return NextResponse.json(
          { error: "Senha é obrigatória para novo cadastro." },
          { status: 400 }
        );
      }

      // Cria cliente no Asaas
      let asaasCustomer;
      try {
        asaasCustomer = await createAsaasCustomer({
          name,
          email,
          cpfCnpj: cpf,
          mobilePhone: phone,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar cliente no Asaas";
        console.error("[checkout] Asaas createCustomer:", msg);
        return NextResponse.json(
          { error: "Falha ao registrar no gateway de pagamento. Tente novamente." },
          { status: 502 }
        );
      }

      asaasCustomerId = asaasCustomer.id;

      // Cria terapeuta no Supabase (fica inativo até confirmação do webhook)
      const { data: newTherapist, error: therapistErr } = await supabase
        .from("therapists")
        .insert({
          display_name: name,
          email: email.toLowerCase().trim(),
          phone,
          cpf,
          asaas_customer_id: asaasCustomerId,
          is_active: false, // Ativação exclusivamente via webhook validado
        })
        .select("id")
        .single();

      if (therapistErr || !newTherapist) {
        console.error("[checkout] insert therapist:", therapistErr);
        return NextResponse.json({ error: "Falha ao criar conta profissional." }, { status: 500 });
      }

      therapistId = newTherapist.id;

      // Cria usuário com hash de senha
      const passwordHash = await bcrypt.hash(password, 12);
      const { error: userErr } = await supabase.from("users").insert({
        therapist_id: therapistId,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        is_active: false, // Ativado exclusivamente pelo webhook
      });

      if (userErr) {
        console.error("[checkout] insert user:", userErr);
        await supabase.from("therapists").delete().eq("id", therapistId);
        return NextResponse.json({ error: "Falha ao criar credenciais de acesso." }, { status: 500 });
      }
    }

    // ── 2. Criar assinatura no Asaas ─────────────────────────────────────────
    const remoteIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

    let asaasSubscription;
    try {
      asaasSubscription = await createAsaasSubscription({
        customer: asaasCustomerId,
        billingType: billingType as BillingType,
        value: planPriceReais,
        nextDueDate: todayPlusDays(1), // vence amanhã (primeiro ciclo)
        cycle: "MONTHLY",
        description: `Assinatura ${planName} – mensal`,
        ...(billingType === "CREDIT_CARD" && card
          ? {
              creditCard: {
                holderName: card.holderName,
                number: card.number,
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                ccv: card.ccv,
              },
              creditCardHolderInfo: {
                name,
                email,
                cpfCnpj: cpf,
                mobilePhone: phone,
              },
              remoteIp,
            }
          : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar assinatura no Asaas";
      console.error("[checkout] Asaas createSubscription:", msg);
      return NextResponse.json(
        { error: "Falha ao processar pagamento. Verifique os dados e tente novamente." },
        { status: 502 }
      );
    }

    // ── 3. Criar registro de assinatura no Supabase com status 'pending' ──────
    // REGRA CRÍTICA DE TRANSIÇÃO DE PLANO:
    // A nova assinatura nasce como 'pending'. Se o profissional já possui uma assinatura
    // ativa, a assinatura anterior permanece ativa e válida até a confirmação do webhook!
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        therapist_id: therapistId,
        plan: selectedPlan.id,
        status: "pending",
        billing_cycle: "monthly",
        amount_cents: selectedPlan.priceCents,
        next_billing_date: todayPlusDays(31),
        is_trial: false,
      })
      .select("id")
      .single();

    if (subErr || !subscription) {
      console.error("[checkout] insert subscription:", subErr);
      return NextResponse.json({ error: "Falha ao registrar assinatura local." }, { status: 500 });
    }

    // ── 4. Criar fatura vinculada ao external_id do Asaas ────────────────────
    await supabase.from("invoices").insert({
      subscription_id: subscription.id,
      external_id: asaasSubscription.id,
      amount_cents: selectedPlan.priceCents,
      status: "pending",
      due_date: todayPlusDays(1),
    });

    // ── 5. Resposta por método de pagamento ──────────────────────────────────
    if (billingType === "CREDIT_CARD") {
      const isConfirmed =
        ["CONFIRMED", "RECEIVED"].includes(asaasSubscription.status ?? "");

      return NextResponse.json({
        success: true,
        billingType: "CREDIT_CARD",
        activated: isConfirmed,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
      });
    }

    if (billingType === "PIX") {
      let pixQrCode = null;
      try {
        const paymentsData = await asaasGet<{
          data: Array<{ id: string; status: string }>;
        }>(`/payments?subscription=${asaasSubscription.id}`);

        const firstPayment = paymentsData.data?.[0];
        if (firstPayment?.id) {
          pixQrCode = await getPixQrCode(firstPayment.id);
        }
      } catch (err) {
        console.warn("[checkout] Falha ao obter QR code PIX imediato:", err);
      }

      return NextResponse.json({
        success: true,
        billingType: "PIX",
        asaasSubscriptionId: asaasSubscription.id,
        status: asaasSubscription.status,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        pixQrCode: pixQrCode
          ? {
              encodedImage: pixQrCode.encodedImage,
              payload: pixQrCode.payload,
            }
          : null,
      });
    }

    // Pagamento via Boleto
    let bankSlipUrl: string | null = null;
    try {
      const paymentsData = await asaasGet<{
        data: Array<{ bankSlipUrl?: string }>;
      }>(`/payments?subscription=${asaasSubscription.id}`);
      bankSlipUrl = paymentsData.data?.[0]?.bankSlipUrl ?? null;
    } catch (err) {
      console.warn("[checkout] Falha ao obter URL do boleto imediato:", err);
    }

    return NextResponse.json({
      success: true,
      billingType: "BOLETO",
      asaasSubscriptionId: asaasSubscription.id,
      status: asaasSubscription.status,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      bankSlipUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[checkout] Erro inesperado:", message);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
