import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { startFreeTrial } from "@/lib/plans/trialService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trialRegisterSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido").toLowerCase(),
  phone: z.string().trim().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

/**
 * POST /api/trial/start
 * Inicia o período de teste gratuito de 7 dias do plano Profissional:
 * 1. 100% pelo backend, sem cartão de crédito.
 * 2. Cria conta de terapeuta e usuário ativados imediatamente.
 * 3. Cria a assinatura em modo trial (`is_trial = true`, expiração em exatamente 7 dias).
 * 4. Proteção anti-abuso estrita (`trial_used = true` gravado permanentemente).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = trialRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;
    const supabase = createSupabaseAdminClient();

    // 1. Verifica se o e-mail já existe
    const { data: existing } = await supabase
      .from("therapists")
      .select("id, trial_used")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.trial_used) {
        return NextResponse.json(
          {
            error: "Este profissional já utilizou o período de teste gratuito de 7 dias. Faça login para assinar um plano.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Este e-mail já está cadastrado. Faça login na sua conta.", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }

    // 2. Cria terapeuta no Supabase
    const { data: therapist, error: therapistErr } = await supabase
      .from("therapists")
      .insert({
        display_name: name,
        email,
        phone,
        is_active: true, // Ativado para uso imediato no trial
      })
      .select("id")
      .single();

    if (therapistErr || !therapist) {
      return NextResponse.json({ error: "Erro ao criar perfil profissional." }, { status: 500 });
    }

    // 3. Cria usuário com hash de senha
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: userErr } = await supabase.from("users").insert({
      therapist_id: therapist.id,
      email,
      password_hash: passwordHash,
      is_active: true,
    });

    if (userErr) {
      await supabase.from("therapists").delete().eq("id", therapist.id);
      return NextResponse.json({ error: "Erro ao criar credenciais de acesso." }, { status: 500 });
    }

    // 4. Inicia o Trial no backend através do trialService
    const trialResult = await startFreeTrial(therapist.id);

    if (!trialResult.success) {
      return NextResponse.json(
        { error: trialResult.error ?? "Não foi possível ativar o teste gratuito." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Período de teste gratuito ativado com sucesso!",
        therapistId: therapist.id,
        trialEndsAt: trialResult.trialEndsAt,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
