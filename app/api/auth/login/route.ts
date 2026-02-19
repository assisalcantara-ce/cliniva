import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

// Mock authentication - in production use Supabase Auth or proper password hashing
const DEFAULT_PASSWORD = "THERAPY2025";
const MOCK_USERS = [
  {
    id: "therapist-1",
    email: "dra.cristiane@therapy.com",
    password: DEFAULT_PASSWORD,
    name: "Dra. Cristiane",
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Mock authentication
    const user = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Create session token (mock - in production use proper JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({ userId: user.id, email: user.email })
    ).toString("base64");

    // Create response with cookie
    const response = NextResponse.json(
      {
        message: "Login bem-sucedido",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 200 }
    );

    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
