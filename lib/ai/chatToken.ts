import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || "cliniva-default-session-salt-2026";
}

/**
 * Gera um token de sessão opaco e assinado (HMAC-SHA256) no formato:
 * `<sessionId>.<signatureHex>`
 */
export function generateSessionToken(sessionId: string): string {
  const secret = getSecret();
  const signature = createHmac("sha256", secret).update(sessionId).digest("hex");
  return `${sessionId}.${signature}`;
}

/**
 * Valida a assinatura do token de sessão. Retorna o sessionId se válido ou null se for forjado/inválido.
 */
export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [sessionId, providedSig] = parts;
  if (!sessionId || !providedSig) return null;

  const secret = getSecret();
  const expectedSig = createHmac("sha256", secret).update(sessionId).digest("hex");

  try {
    const a = Buffer.from(providedSig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return sessionId;
  } catch {
    return null;
  }
}
