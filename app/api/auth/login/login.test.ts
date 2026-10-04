import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createAuthToken } from "@/lib/auth";

describe("Authentication & Login Security Suite (/api/auth/login)", () => {
  test("1. Rejeita requisição com campos ausentes (status 400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error?: string };
    assert.equal(json.error, "Email e senha são obrigatórios");
  });

  test("2. Rejeita requisição com email inválido (status 400)", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email", password: "123" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  test("3. Login de contingência em ambiente development/test (status 200)", async () => {
    const oldEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    try {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "dra.cristiane@therapy.com",
          password: "THERAPY2025",
        }),
        headers: { "content-type": "application/json" },
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = (await res.json()) as {
        message?: string;
        user?: { id?: string; email?: string; name?: string };
      };
      assert.equal(json.message, "Login bem-sucedido");
      assert.equal(json.user?.email, "dra.cristiane@therapy.com");

      const setCookie = res.headers.get("set-cookie");
      assert.ok(setCookie?.includes("auth_token="));
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = oldEnv;
    }
  });

  test("4. SEGURANÇA EM PRODUÇÃO: Contingência de demonstração NUNCA funciona em production quando banco está indisponível", async () => {
    const oldEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "dra.cristiane@therapy.com",
          password: "THERAPY2025",
        }),
        headers: { "content-type": "application/json" },
      });

      const res = await POST(req);
      // Em produção sem banco, deve retornar 503 (serviço indisponível), NUNCA 200
      assert.notEqual(res.status, 200);
      assert.equal(res.status, 503);
      const json = (await res.json()) as { error?: string };
      assert.ok(json.error?.includes("indisponível"));
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = oldEnv;
    }
  });

  test("5. SEGURANÇA EM PRODUÇÃO: Ausência de AUTH_SECRET em production bloqueia emissão de tokens", () => {
    const oldEnv = process.env.NODE_ENV;
    const oldSecret = process.env.AUTH_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.AUTH_SECRET;

    try {
      assert.throws(
        () => {
          createAuthToken({
            userId: "00000000-0000-0000-0000-000000000001",
            email: "dra.cristiane@therapy.com",
          });
        },
        /AUTH_SECRET must be defined in production/
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = oldEnv;
      if (oldSecret) process.env.AUTH_SECRET = oldSecret;
    }
  });

  test("6. SEGURANÇA: Senha incorreta para usuário desconhecido é rejeitada (status 401 ou 503)", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "outro.usuario@clinica.com",
        password: "senha-incorreta-qualquer",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    assert.ok(res.status === 401 || res.status === 503);
    assert.notEqual(res.status, 500);
    assert.notEqual(res.status, 200);
  });
});
