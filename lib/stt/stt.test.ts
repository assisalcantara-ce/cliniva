import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSTTResult,
  sttResultToRealtimeChunk,
} from "./normalizer";
import { MockSTTProvider } from "./providers/mock";
import { sttRegistry } from "./registry";
import type { RawSTTInputPayload } from "./types";

test("STT Layer & Abstraction Tests (Fase 3B - Cenários A a I)", async (t) => {
  await t.test("A) Resultado STT válido → RealtimeTranscriptChunk correto", () => {
    const raw: RawSTTInputPayload = {
      id: "chunk-stt-01",
      sessionId: "sess-123",
      therapistId: "ther-456",
      patientId: "pat-789",
      text: "Estou me sentindo muito melhor hoje com os exercícios.",
      speaker: "paciente",
      isFinal: true,
      confidence: 0.95,
      tStartSeconds: 1.5,
      tEndSeconds: 4.8,
      timestamp: 1700000000,
      sequenceNumber: 1,
    };

    const sttResult = normalizeSTTResult(raw);
    const chunk = sttResultToRealtimeChunk(sttResult);

    assert.equal(chunk.id, "chunk-stt-01");
    assert.equal(chunk.speaker, "paciente");
    assert.equal(chunk.text, "Estou me sentindo muito melhor hoje com os exercícios.");
    assert.equal(chunk.tStartSeconds, 1.5);
    assert.equal(chunk.tEndSeconds, 4.8);
    assert.equal(chunk.timestamp, 1700000000);
    assert.equal(chunk.sequenceNumber, 1);
  });

  await t.test("B) Resultado interim → marcado corretamente", () => {
    const raw: RawSTTInputPayload = {
      sessionId: "sess-123",
      therapistId: "ther-456",
      text: "Eu estava pensando que...",
      isFinal: false,
    };

    const result = normalizeSTTResult(raw);
    assert.equal(result.isFinal, false);
    assert.equal(result.isInterim, true);
  });

  await t.test("C) Resultado final → marcado corretamente", () => {
    const raw: RawSTTInputPayload = {
      sessionId: "sess-123",
      therapistId: "ther-456",
      text: "Eu estava pensando que seria bom mudar de emprego.",
      isFinal: true,
    };

    const result = normalizeSTTResult(raw);
    assert.equal(result.isFinal, true);
    assert.equal(result.isInterim, false);
  });

  await t.test("D) Timestamps preservados (start / end / sequence)", () => {
    const raw: RawSTTInputPayload = {
      sessionId: "sess-123",
      therapistId: "ther-456",
      text: "Fala com timestamp.",
      startTime: "10.25s",
      endTime: "14.50s",
      timestamp: 1699999999,
      sequenceNumber: 42,
    };

    const result = normalizeSTTResult(raw);
    assert.equal(result.tStartSeconds, 10.25);
    assert.equal(result.tEndSeconds, 14.5);
    assert.equal(result.timestamp, 1699999999);
    assert.equal(result.sequenceNumber, 42);
  });

  await t.test("E) Speaker preservado quando disponível (paciente / terapeuta / custom)", () => {
    const r1 = normalizeSTTResult({
      sessionId: "s",
      therapistId: "t",
      text: "texto",
      speaker: "patient",
    });
    assert.equal(r1.speaker, "paciente");

    const r2 = normalizeSTTResult({
      sessionId: "s",
      therapistId: "t",
      text: "texto",
      speaker: "therapist",
    });
    assert.equal(r2.speaker, "terapeuta");

    const r3 = normalizeSTTResult({
      sessionId: "s",
      therapistId: "t",
      text: "texto",
      speaker: "speaker_0",
    });
    assert.equal(r3.speaker, "terapeuta");

    const r4 = normalizeSTTResult({
      sessionId: "s",
      therapistId: "t",
      text: "texto",
      speakerTag: 1,
    });
    assert.equal(r4.speaker, "paciente");
  });

  await t.test("F) Provider desconhecido → erro controlado", () => {
    assert.throws(
      () => {
        sttRegistry.getProvider("provider_inexistente_xyz");
      },
      /Provedor de STT desconhecido: "provider_inexistente_xyz"/
    );
  });

  await t.test("G) Resultado vazio ou inválido → rejeição segura", () => {
    assert.throws(
      () => {
        normalizeSTTResult({
          sessionId: "sess",
          therapistId: "ther",
          text: "   ",
        });
      },
      /texto da transcrição está vazio ou inválido/
    );

    assert.throws(
      () => {
        normalizeSTTResult({
          sessionId: "",
          therapistId: "ther",
          text: "Texto válido",
        });
      },
      /Identificadores de segurança obrigatórios/
    );
  });

  await t.test("H) Provider mock → funciona sem API externa", async () => {
    const mockProvider = new MockSTTProvider({
      mockText: "Simulação de paciente relatando ansiedade.",
      mockSpeaker: "paciente",
    });

    const result = await mockProvider.transcribeChunk({
      sessionId: "sess-mock",
      therapistId: "ther-mock",
      sequenceNumber: 1,
    });

    assert.equal(result.text, "Simulação de paciente relatando ansiedade.");
    assert.equal(result.speaker, "paciente");
    assert.equal(result.isFinal, true);
    assert.equal(result.confidence, 0.98);

    const chunk = sttResultToRealtimeChunk(result);
    assert.equal(chunk.text, "Simulação de paciente relatando ansiedade.");
    assert.equal(chunk.speaker, "paciente");
  });

  await t.test("I) Normalização de formatos diferentes → mesmo contrato interno", () => {
    // Formato estilo Whisper / OpenAI
    const openAIFormat: RawSTTInputPayload = {
      sessionId: "s1",
      therapistId: "t1",
      text: "Transcrição OpenAI",
      tStartSeconds: 0.0,
      tEndSeconds: 3.2,
      confidenceScore: 0.99,
    };

    // Formato estilo Google Cloud / Deepgram
    const cloudFormat: RawSTTInputPayload = {
      sessionId: "s1",
      therapistId: "t1",
      transcript: "Transcrição Google",
      startTime: "0.0s",
      endTime: "3.2s",
      confidence: 0.99,
      speakerTag: "speaker_1",
      is_final: true,
    };

    const res1 = normalizeSTTResult(openAIFormat);
    const res2 = normalizeSTTResult(cloudFormat);

    assert.equal(res1.tStartSeconds, res2.tStartSeconds);
    assert.equal(res1.tEndSeconds, res2.tEndSeconds);
    assert.equal(res1.confidence, res2.confidence);
    assert.equal(res1.isFinal, res2.isFinal);
    assert.equal(res2.speaker, "paciente");
  });
});
