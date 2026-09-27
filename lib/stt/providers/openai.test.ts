import assert from "node:assert/strict";
import test from "node:test";
import { sttRegistry } from "../registry";
import { OpenAISTTProvider } from "./openai";
import { MockSTTProvider } from "./mock";
import { sttResultToRealtimeChunk } from "../normalizer";
import type { STTInput } from "../types";

test("OpenAI STT Provider & Real Provider Integration Tests (Fase 3C - Cenários A a H)", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnvKey = process.env.OPENAI_API_KEY;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnvKey !== undefined) {
      process.env.OPENAI_API_KEY = originalEnvKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  await t.test("A) Provider real (openai) corretamente registrado no STTRegistry", () => {
    const provider = sttRegistry.getProvider("openai");
    assert.equal(provider.id, "openai");
    assert.equal(provider.name, "OpenAI Whisper STT Provider");
    assert.ok(provider.capabilities.supportedAudioFormats.includes("audio/webm"));
    assert.ok(sttRegistry.listProviders().includes("openai"));
  });

  await t.test("B) Configuração ausente (sem OPENAI_API_KEY) → erro controlado", async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAISTTProvider({ apiKey: undefined });

    const input: STTInput = {
      sessionId: "sess-1",
      therapistId: "ther-1",
      audioChunk: Buffer.from("fake-audio-bytes"),
    };

    await assert.rejects(
      async () => {
        await provider.transcribeChunk(input);
      },
      /Configuração ausente: OPENAI_API_KEY não foi definida/
    );
  });

  await t.test("C) Resposta válida da API (mock HTTP) → STTTranscriptResult completo", async () => {
    process.env.OPENAI_API_KEY = "sk-test-secret-key-12345";

    // Mock do fetch da OpenAI
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer sk-test-secret-key-12345");

      return new Response(
        JSON.stringify({
          text: "O paciente relatou crises de ansiedade recorrentes durante o trabalho.",
          language: "portuguese",
          duration: 4.8,
          segments: [
            {
              id: 0,
              start: 0.5,
              end: 4.8,
              text: "O paciente relatou crises de ansiedade recorrentes durante o trabalho.",
              avg_logprob: -0.15,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const provider = new OpenAISTTProvider();
    const result = await provider.transcribeChunk({
      sessionId: "sess-valid-01",
      therapistId: "ther-valid-01",
      patientId: "pat-valid-01",
      audioChunk: Buffer.from("dummy-audio-bytes"),
      mimeType: "audio/webm",
      sequenceNumber: 3,
      language: "pt",
    });

    assert.equal(result.sessionId, "sess-valid-01");
    assert.equal(result.therapistId, "ther-valid-01");
    assert.equal(result.patientId, "pat-valid-01");
    assert.equal(result.text, "O paciente relatou crises de ansiedade recorrentes durante o trabalho.");
    assert.equal(result.isFinal, true);
    assert.equal(result.tStartSeconds, 0.5);
    assert.equal(result.tEndSeconds, 4.8);
    assert.equal(result.sequenceNumber, 3);
    assert.ok(typeof result.confidence === "number" && result.confidence > 0.8);
  });

  await t.test("D) Resposta vazia ou inválida da API → erro seguro e controlado", async () => {
    process.env.OPENAI_API_KEY = "sk-test-secret-key-12345";

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          text: "   ",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const provider = new OpenAISTTProvider();

    await assert.rejects(
      async () => {
        await provider.transcribeChunk({
          sessionId: "sess-err",
          therapistId: "ther-err",
          audioChunk: Buffer.from("audio-bytes"),
        });
      },
      /resposta da transcrição retornou texto vazio ou inválido/
    );
  });

  await t.test("E) Conversão para RealtimeTranscriptChunk preserva integridade", async () => {
    process.env.OPENAI_API_KEY = "sk-test-secret-key-12345";

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          text: "Fala convertida para realtime chunk.",
          duration: 3.2,
          segments: [{ id: 0, start: 0.0, end: 3.2, text: "Fala convertida para realtime chunk." }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const provider = new OpenAISTTProvider();
    const result = await provider.transcribeChunk({
      sessionId: "sess-chunk",
      therapistId: "ther-chunk",
      audioChunk: Buffer.from("audio-bytes"),
      sequenceNumber: 7,
    });

    const chunk = sttResultToRealtimeChunk(result);
    assert.equal(chunk.id, result.id);
    assert.equal(chunk.text, "Fala convertida para realtime chunk.");
    assert.equal(chunk.tStartSeconds, 0.0);
    assert.equal(chunk.tEndSeconds, 3.2);
    assert.equal(chunk.sequenceNumber, 7);
  });

  await t.test("F) MockSTTProvider continua funcionando intacto", async () => {
    const mock = sttRegistry.getProvider("mock") as MockSTTProvider;
    assert.equal(mock.id, "mock");

    const res = await mock.transcribeChunk({
      sessionId: "sess-mock",
      therapistId: "ther-mock",
    });

    assert.ok(res.text.length > 0);
    assert.equal(res.sessionId, "sess-mock");
  });

  await t.test("G) Nenhum segredo ou chave de API aparece em mensagens de erro", async () => {
    const secretKey = "sk-SUPER-SECRET-TOKEN-DO-NOT-LEAK";
    process.env.OPENAI_API_KEY = secretKey;

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: { message: "Invalid authentication parameters" },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const provider = new OpenAISTTProvider();

    try {
      await provider.transcribeChunk({
        sessionId: "sess-sec",
        therapistId: "ther-sec",
        audioChunk: Buffer.from("audio"),
      });
      assert.fail("Deveria ter lançado erro de autenticação");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      assert.ok(!errMsg.includes(secretKey), "A mensagem de erro não pode conter o segredo");
      assert.ok(errMsg.includes("OpenAI STT (401)"));
    }
  });

  await t.test("H) Isolamento estrito de sessionId e therapistId", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    const provider = new OpenAISTTProvider();

    // Sem therapistId
    await assert.rejects(
      async () => {
        await provider.transcribeChunk({
          sessionId: "sess-only",
          therapistId: "",
          audioChunk: Buffer.from("audio"),
        });
      },
      /Identificadores de segurança obrigatórios ausentes/
    );

    // Sem audioChunk
    await assert.rejects(
      async () => {
        await provider.transcribeChunk({
          sessionId: "sess-ok",
          therapistId: "ther-ok",
          audioChunk: undefined,
        });
      },
      /Áudio ausente para transcrição/
    );
  });
});
