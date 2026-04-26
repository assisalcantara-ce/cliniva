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
  password: z.string().min(8, "Senha mínima de 8 caracteres"),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
  card: creditCardSchema.optional(),
});

// Valor do plano (em R$)
const PLAN_VALUE = 299.9;
const PLAN_NAME = "Cliniva Pro";

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

    const { name, email, cpf, phone, password, billingType, card } = parsed.data;

    // Cartão requer dados do cartão
    if (billingType === "CREDIT_CARD" && !card) {
      return NextResponse.json(
        { error: "Dados do cartão são obrigatórios para pagamento com cartão" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // ── 1. Verificar se email já existe ──────────────────────────────────────
    const { data: existing } = await supabase
      .from("therapists")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Este email já está cadastrado. Faça login ou recupere sua senha." },
        { status: 409 }
      );
    }

    // ── 2. Criar cliente no Asaas ────────────────────────────────────────────
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

    // ── 3. Criar assinatura no Asaas ─────────────────────────────────────────
    const remoteIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

    let asaasSubscription;
    try {
      asaasSubscription = await createAsaasSubscription({
        customer: asaasCustomer.id,
        billingType: billingType as BillingType,
        value: PLAN_VALUE,
        nextDueDate: todayPlusDays(1), // vence amanhã (primeiro ciclo)
        cycle: "MONTHLY",
        description: `Assinatura ${PLAN_NAME} – mensal`,
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

    // ── 4. Criar terapeuta no Supabase ───────────────────────────────────────
    const { data: therapist, error: therapistErr } = await supabase
      .from("therapists")
      .insert({
        display_name: name,
        email,
        phone,
        cpf,
        asaas_customer_id: asaasCustomer.id,
        is_active: false, // ativado pelo webhook quando pagamento confirmado
      })
      .select("id")
      .single();

    if (therapistErr || !therapist) {
      console.error("[checkout] insert therapist:", therapistErr);
      return NextResponse.json({ error: "Falha ao criar conta." }, { status: 500 });
    }

    // ── 5. Hash da senha e criar usuário ─────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    const { error: userErr } = await supabase.from("users").insert({
      therapist_id: therapist.id,
      email,
      password_hash: passwordHash,
      is_active: false, // ativado pelo webhook
    });

    if (userErr) {
      console.error("[checkout] insert user:", userErr);
      // Rollback: remover terapeuta criado
      await supabase.from("therapists").delete().eq("id", therapist.id);
      return NextResponse.json({ error: "Falha ao criar usuário." }, { status: 500 });
    }

    // ── 6. Criar assinatura no Supabase ──────────────────────────────────────
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        therapist_id: therapist.id,
        plan: "pro",
        status: "pending",
        billing_cycle: "monthly",
        amount_cents: Math.round(PLAN_VALUE * 100),
        next_billing_date: todayPlusDays(31),
      })
      .select("id")
      .single();

    if (subErr || !subscription) {
      console.error("[checkout] insert subscription:", subErr);
    }

    // ── 7. Criar invoice vinculada à assinatura do Asaas ─────────────────────
    if (subscription) {
      await supabase.from("invoices").insert({
        subscription_id: subscription.id,
        external_id: asaasSubscription.id, // ID da assinatura no Asaas
        amount_cents: Math.round(PLAN_VALUE * 100),
        status: "pending",
        payment_method:
          billingType === "PIX"
            ? "pix"
            : billingType === "BOLETO"
              ? "boleto"
              : "credit_card",
        due_date: todayPlusDays(1),
      });
    }

    // ── 8. Para PIX: buscar QR code da 1ª cobrança gerada pela assinatura ───
    // A Asaas cria o primeiro pagamento automaticamente; precisamos buscá-lo.
    let pixQrCode: { encodedImage: string; payload: string } | null = null;
    let bankSlipUrl: string | null = null;

    if (billingType === "PIX" || billingType === "BOLETO") {
      try {
        const paymentsData = await asaasGet<{
          data?: Array<{ id: string; bankSlipUrl?: string }>;
        }>(`/payments?subscription=${asaasSubscription.id}`);

        const firstPayment = paymentsData.data?.[0];
        console.log("[checkout] first payment:", firstPayment?.id, firstPayment);

        if (firstPayment?.id) {
          if (billingType === "PIX") {
            pixQrCode = await getPixQrCode(firstPayment.id);
          } else {
            bankSlipUrl = firstPayment.bankSlipUrl ?? null;
          }
        }
      } catch (err) {
        console.error("[checkout] fetch payment data:", err);
        // Não-fatal
      }
    }

    // ── 9. Para cartão aprovado imediatamente, ativar conta ──────────────────
    const cardApproved =
      billingType === "CREDIT_CARD" &&
      ["CONFIRMED", "RECEIVED"].includes(asaasSubscription.status ?? "");

    if (cardApproved) {
      await supabase.from("therapists").update({ is_active: true }).eq("id", therapist.id);
      await supabase.from("users").update({ is_active: true }).eq("therapist_id", therapist.id);
      if (subscription) {
        await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("id", subscription.id);
      }
    }

    return NextResponse.json(
      {
        message: "Cadastro realizado com sucesso.",
        billingType,
        asaasSubscriptionId: asaasSubscription.id,
        status: asaasSubscription.status,
        activated: cardApproved,
        pixQrCode,
        bankSlipUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[checkout] unhandled error:", msg);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
