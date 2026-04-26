import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export interface AuthUser {
  userId: string; // = therapist_id
  email: string;
  name?: string;
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing env var: AUTH_SECRET");
  return s;
}

/**
 * Cria token assinado com HMAC-SHA256.
 * Formato: base64url(payload).base64url(sig)
 */
export function createAuthToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Valida assinatura e retorna o AuthUser, ou null se inválido/expirado.
 */
export function parseAuthToken(token: string): AuthUser | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

    // Comparação segura contra timing attacks
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as AuthUser;
    return { userId: decoded.userId, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

/**
 * Extrai o therapist_id do cookie auth_token.
 * Lança erro com código para ser tratado nas rotas.
 */
export function getTherapistIdFromRequest(req: NextRequest): string {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) throw Object.assign(new Error("Não autenticado"), { code: "UNAUTHENTICATED" });
  const user = parseAuthToken(token);
  if (!user) throw Object.assign(new Error("Token inválido"), { code: "INVALID_TOKEN" });
  return user.userId;
}

/** Resposta padronizada para erros de autenticação. */
export function authError(code: string) {
  const status = code === "UNAUTHENTICATED" ? 401 : 401;
  return { error: code === "UNAUTHENTICATED" ? "Não autenticado" : "Token inválido", status };
}
