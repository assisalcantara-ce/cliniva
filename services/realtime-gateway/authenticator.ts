import { createHmac, timingSafeEqual } from "crypto";
import type { AuthenticatedUser, RealtimeAuthenticator } from "./types";

/**
 * Autenticador oficial baseado no padrão HMAC do Cliniva (compatível com auth_token).
 */
export class ClinivaHmacAuthenticator implements RealtimeAuthenticator {
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? process.env.AUTH_SECRET ?? "";
  }

  public async authenticate(token: string): Promise<AuthenticatedUser | null> {
    if (!token || !this.secret) return null;

    try {
      const dot = token.lastIndexOf(".");
      if (dot === -1) return null;

      const payload = token.slice(0, dot);
      const sig = token.slice(dot + 1);

      const expected = createHmac("sha256", this.secret).update(payload).digest("base64url");

      if (
        sig.length !== expected.length ||
        !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
      ) {
        return null;
      }

      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf-8")
      ) as { userId?: string; email?: string; name?: string };

      if (!decoded.userId || !decoded.email) return null;

      return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Autenticador Mock para testes e desenvolvimento isolado.
 */
export class MockRealtimeAuthenticator implements RealtimeAuthenticator {
  private validTokens = new Map<string, AuthenticatedUser>();

  constructor(initialUsers?: Record<string, AuthenticatedUser>) {
    if (initialUsers) {
      Object.entries(initialUsers).forEach(([token, user]) => {
        this.validTokens.set(token, user);
      });
    }
  }

  public registerToken(token: string, user: AuthenticatedUser): void {
    this.validTokens.set(token, user);
  }

  public async authenticate(token: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;
    return this.validTokens.get(token) ?? null;
  }
}
