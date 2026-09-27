import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientAudioTransportMessageSchema,
  InMemoryAudioTransport,
  MAX_AUDIO_CHUNK_BYTES,
  type ServerAudioTransportMessage,
  type AudioTransportState,
} from "./index";

test("AudioTransport & Realtime Audio Messaging Tests (Fase 3E - Cenários A a K)", async (t) => {
  const defaultSession = {
    sessionId: "sess-trans-01",
    therapistId: "ther-trans-01",
    patientId: "pat-trans-01",
  };

  await t.test("A) Conexão inicial estabelecida com sucesso", async () => {
    const states: AudioTransportState[] = [];
    const transport = new InMemoryAudioTransport(defaultSession, {
      onStateChange: (s) => states.push(s),
    });

    assert.equal(transport.state, "disconnected");
    await transport.connect();
    assert.equal(transport.state, "connected");
    assert.ok(states.includes("connecting"));
    assert.ok(states.includes("connected"));
  });

  await t.test("B) session_start → recebe session_ack (started)", async () => {
    const receivedMessages: ServerAudioTransportMessage[] = [];
    const transport = new InMemoryAudioTransport(defaultSession, {
      onMessage: (m) => receivedMessages.push(m),
    });

    await transport.connect();
    transport.send({
      type: "session_start",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      mimeType: "audio/webm",
      sampleRate: 16000,
    });

    // Aguarda microtask de processamento
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(receivedMessages.length, 1);
    assert.equal(receivedMessages[0].type, "session_ack");
    if (receivedMessages[0].type === "session_ack") {
      assert.equal(receivedMessages[0].status, "started");
      assert.equal(receivedMessages[0].sessionId, defaultSession.sessionId);
    }
  });

  await t.test("C) audio_chunk válido → recebe session_ack (received_chunk)", async () => {
    const receivedMessages: ServerAudioTransportMessage[] = [];
    const transport = new InMemoryAudioTransport(defaultSession, {
      onMessage: (m) => receivedMessages.push(m),
    });

    await transport.connect();
    transport.send({
      type: "session_start",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      mimeType: "audio/webm",
    });

    transport.send({
      type: "audio_chunk",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      sequenceNumber: 1,
      dataBase64: Buffer.from("audio-bytes").toString("base64"),
      mimeType: "audio/webm",
      timestamp: Date.now(),
      durationEstimatedSeconds: 4.0,
    });

    await new Promise((r) => setTimeout(r, 10));

    assert.equal(receivedMessages.length, 2);
    const chunkAck = receivedMessages[1];
    assert.equal(chunkAck.type, "session_ack");
    if (chunkAck.type === "session_ack") {
      assert.equal(chunkAck.status, "received_chunk");
      assert.equal(chunkAck.sequenceNumberAcked, 1);
    }
  });

  await t.test("D) Payload inválido → rejeição via Zod e emissão de erro", async () => {
    const transport = new InMemoryAudioTransport(defaultSession);
    await transport.connect();

    assert.throws(
      () => {
        // Envia mensagem com dados faltando
        transport.send({
          type: "audio_chunk",
          sessionId: "", // Inválido
          therapistId: defaultSession.therapistId,
          sequenceNumber: -1, // Inválido
          dataBase64: "", // Inválido
          mimeType: "",
          timestamp: 0,
        } as unknown as Parameters<typeof transport.send>[0]);
      },
      /Validação de transporte falhou/
    );
  });

  await t.test("E) Payload acima do limite (1MB) → rejeição segura", () => {
    const hugeBase64 = "A".repeat(Math.ceil((MAX_AUDIO_CHUNK_BYTES * 4) / 3) + 200);

    const parseResult = ClientAudioTransportMessageSchema.safeParse({
      type: "audio_chunk",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      sequenceNumber: 1,
      dataBase64: hugeBase64,
      mimeType: "audio/webm",
      timestamp: Date.now(),
    });

    assert.equal(parseResult.success, false);
    if (!parseResult.success) {
      assert.ok(parseResult.error.issues[0].message.includes("limite máximo"));
    }
  });

  await t.test("F) Chunk fora de ordem → detecta e rejeita com erro", async () => {
    const receivedMessages: ServerAudioTransportMessage[] = [];
    const transport = new InMemoryAudioTransport(defaultSession, {
      onMessage: (m) => receivedMessages.push(m),
    });

    await transport.connect();
    transport.send({
      type: "session_start",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      mimeType: "audio/webm",
    });

    // Envia chunk 5
    transport.send({
      type: "audio_chunk",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
      sequenceNumber: 5,
      dataBase64: Buffer.from("audio-bytes-5").toString("base64"),
      mimeType: "audio/webm",
      timestamp: Date.now(),
    });

    // Envia chunk 3 (atrasado)
    assert.throws(
      () => {
        transport.send({
          type: "audio_chunk",
          sessionId: defaultSession.sessionId,
          therapistId: defaultSession.therapistId,
          sequenceNumber: 3,
          dataBase64: Buffer.from("audio-bytes-3").toString("base64"),
          mimeType: "audio/webm",
          timestamp: Date.now(),
        });
      },
      /Chunk fora de ordem/
    );
  });

  await t.test("G) pause / resume altera estado e emite acks correspondentes", async () => {
    const receivedMessages: ServerAudioTransportMessage[] = [];
    const transport = new InMemoryAudioTransport(defaultSession, {
      onMessage: (m) => receivedMessages.push(m),
    });

    await transport.connect();
    transport.send({
      type: "session_pause",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
    });
    assert.equal(transport.state, "paused");

    transport.send({
      type: "session_resume",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
    });
    assert.equal(transport.state, "connected");

    await new Promise((r) => setTimeout(r, 10));

    const statuses = receivedMessages.map((m) => (m.type === "session_ack" ? m.status : null));
    assert.ok(statuses.includes("paused"));
    assert.ok(statuses.includes("resumed"));
  });

  await t.test("H) stop encerra conexão e define estado disconnected", async () => {
    const transport = new InMemoryAudioTransport(defaultSession);
    await transport.connect();

    transport.send({
      type: "session_stop",
      sessionId: defaultSession.sessionId,
      therapistId: defaultSession.therapistId,
    });

    assert.equal(transport.state, "disconnected");
  });

  await t.test("I) Isolamento de sessionId e therapistId verificado no envio", async () => {
    const transport = new InMemoryAudioTransport(defaultSession);
    await transport.connect();

    assert.throws(
      () => {
        transport.send({
          type: "session_start",
          sessionId: "sess-OTHER-PATIENT",
          therapistId: defaultSession.therapistId,
          mimeType: "audio/webm",
        });
      },
      /Inconsistência de segurança/
    );
  });

  await t.test("J) Backpressure: Fila cheia aciona evento e rejeita novos envios", async () => {
    let backpressureFired = false;
    const transport = new InMemoryAudioTransport(
      {
        ...defaultSession,
        maxQueueSize: 2,
      },
      {
        onBackpressure: () => {
          backpressureFired = true;
        },
      }
    );

    await transport.connect();

    // Envia além do maxQueueSize
    assert.throws(
      () => {
        for (let i = 1; i <= 5; i++) {
          transport.send({
            type: "audio_chunk",
            sessionId: defaultSession.sessionId,
            therapistId: defaultSession.therapistId,
            sequenceNumber: i,
            dataBase64: Buffer.from(`chunk-${i}`).toString("base64"),
            mimeType: "audio/webm",
            timestamp: Date.now(),
          });
        }
      },
      /Backpressure/
    );

    assert.equal(backpressureFired, true);
  });

  await t.test("K) Cleanup e disconnect liberam fila e fecham conexão", async () => {
    const transport = new InMemoryAudioTransport(defaultSession);
    await transport.connect();
    assert.equal(transport.state, "connected");

    transport.disconnect();
    assert.equal(transport.state, "disconnected");
  });
});
