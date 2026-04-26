import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().trim().min(1, "Senha obrigatória"),
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = createSupabaseAdminClient();

    // Buscar usuário pelo email (join com therapist para nome e is_active)
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, email, password_hash, is_active, therapist_id, therapists(display_name, is_active)")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (userErr) {
      console.error("[auth/login] query error:", userErr);
      return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    // Verificar conta ativa (pagamento confirmado)
    const therapistActive =
      Array.isArray(user.therapists)
        ? (user.therapists[0] as { is_active?: boolean })?.is_active
        : (user.therapists as { is_active?: boolean } | null)?.is_active;

    const accountActive = (user.is_active as boolean) && (therapistActive ?? true);

    if (!accountActive) {
      return NextResponse.json(
        {
          error:
            "Sua conta ainda não foi ativada. Aguarde a confirmação do pagamento ou verifique seu email.",
        },
        { status: 403 }
      );
    }

    // Atualizar last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id as string);

    // Gerar token de sessão
    const therapistName =
      Array.isArray(user.therapists)
        ? (user.therapists[0] as { display_name?: string })?.display_name
        : (user.therapists as { display_name?: string } | null)?.display_name;

    const sessionToken = createAuthToken({
      userId: user.therapist_id as string,
      email: user.email as string,
      name: therapistName ?? undefined,
    });

    const response = NextResponse.json(
      {
        message: "Login bem-sucedido",
        user: {
          id: user.therapist_id,
          email: user.email,
          name: therapistName,
        },
      },
      { status: 200 }
    );

    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth/login] unhandled:", message);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
