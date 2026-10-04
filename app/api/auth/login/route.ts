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

const DEFAULT_DEMO_EMAIL = "dra.cristiane@therapy.com";
const DEFAULT_DEMO_PASSWORD = "THERAPY2025";
const DEFAULT_DEMO_THERAPIST_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_DEMO_DISPLAY_NAME = "Dra. Cristiane";

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
    const normalizedEmail = email.toLowerCase().trim();
    const isDevOrTest = process.env.NODE_ENV !== "production";
    const isDefaultDemoUser =
      isDevOrTest &&
      normalizedEmail === DEFAULT_DEMO_EMAIL &&
      password === DEFAULT_DEMO_PASSWORD;

    let supabase;
    try {
      supabase = createSupabaseAdminClient();
    } catch (clientErr) {
      console.warn("[auth/login] Warning creating Supabase admin client:", clientErr);
    }

    if (!supabase) {
      if (isDefaultDemoUser) {
        return createSuccessResponse(
          DEFAULT_DEMO_THERAPIST_ID,
          DEFAULT_DEMO_EMAIL,
          DEFAULT_DEMO_DISPLAY_NAME
        );
      }
      return NextResponse.json(
        { error: "Serviço de autenticação temporariamente indisponível." },
        { status: 503 }
      );
    }

    // 1. Buscar usuário diretamente na tabela users sem join complexo (evita falhas PGRST200)
    let user = null;
    let queryFailed = false;

    try {
      const { data, error: userErr } = await supabase
        .from("users")
        .select("id, email, password_hash, is_active, therapist_id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (userErr) {
        console.warn("[auth/login] users query error:", userErr.message || userErr);
        queryFailed = true;
      } else {
        user = data;
      }
    } catch (fetchErr) {
      console.warn("[auth/login] database connection failed:", fetchErr);
      queryFailed = true;
    }

    // 2. Se a conexão falhou: contingência restrita estritamente a ambiente dev/test
    if (queryFailed && isDefaultDemoUser) {
      console.info("[auth/login] Database offline/unreachable in dev/test: logging in default demo therapist.");
      return createSuccessResponse(
        DEFAULT_DEMO_THERAPIST_ID,
        DEFAULT_DEMO_EMAIL,
        DEFAULT_DEMO_DISPLAY_NAME
      );
    }

    if (queryFailed) {
      return NextResponse.json(
        { error: "Serviço de autenticação indisponível no momento. Tente novamente mais tarde." },
        { status: 503 }
      );
    }

    // 3. Usuário não encontrado no banco
    if (!user) {
      if (isDefaultDemoUser) {
        console.info("[auth/login] Demo user not yet seeded in dev/test: allowing development session.");
        return createSuccessResponse(
          DEFAULT_DEMO_THERAPIST_ID,
          DEFAULT_DEMO_EMAIL,
          DEFAULT_DEMO_DISPLAY_NAME
        );
      }
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    // 4. Verificar senha de forma estrita contra o hash armazenado (sem overrides)
    const storedHash = (user.password_hash as string) || "";
    let passwordMatch = false;

    if (storedHash) {
      try {
        passwordMatch = await bcrypt.compare(password, storedHash);
      } catch (bcryptErr) {
        console.warn("[auth/login] bcrypt compare error:", bcryptErr);
        passwordMatch = false;
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    // 5. Verificar se conta do usuário está ativa
    if (user.is_active === false) {
      return NextResponse.json(
        {
          error:
            "Sua conta ainda não foi ativada. Aguarde a confirmação do pagamento ou verifique seu email.",
        },
        { status: 403 }
      );
    }

    // 6. Buscar dados do terapeuta separadamente
    let therapistDisplayName = DEFAULT_DEMO_DISPLAY_NAME;
    const therapistId = (user.therapist_id as string) || DEFAULT_DEMO_THERAPIST_ID;

    if (user.therapist_id) {
      try {
        const { data: therapistData } = await supabase
          .from("therapists")
          .select("id, display_name, is_active")
          .eq("id", user.therapist_id)
          .maybeSingle();

        if (therapistData) {
          if (therapistData.is_active === false) {
            return NextResponse.json(
              {
                error:
                  "Sua conta ainda não foi ativada. Aguarde a confirmação do pagamento ou verifique seu email.",
              },
              { status: 403 }
            );
          }
          if (therapistData.display_name) {
            therapistDisplayName = therapistData.display_name;
          }
        }
      } catch (thErr) {
        console.warn("[auth/login] Warning fetching therapist display_name:", thErr);
      }
    }

    // 7. Atualizar last_login de forma não bloqueante
    void supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id as string)
      .then(() => {});

    return createSuccessResponse(therapistId, user.email as string, therapistDisplayName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth/login] unhandled error in login handler:", message);
    return NextResponse.json(
      { error: "Não foi possível concluir o login. Tente novamente." },
      { status: 500 }
    );
  }
}

function createSuccessResponse(therapistId: string, email: string, name?: string) {
  const sessionToken = createAuthToken({
    userId: therapistId,
    email: email,
    name: name ?? DEFAULT_DEMO_DISPLAY_NAME,
  });

  const response = NextResponse.json(
    {
      message: "Login bem-sucedido",
      user: {
        id: therapistId,
        email: email,
        name: name ?? DEFAULT_DEMO_DISPLAY_NAME,
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
}
