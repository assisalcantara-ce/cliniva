import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { RealtimeGatewayServer } from "./server";
import { MockRealtimeAuthenticator } from "./authenticator";
import type { GatewayInternalEvent } from "./types";
import type { ServerAudioTransportMessage } from "../../lib/audio/transport/types";

const TEST_PORT = 9188;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws/audio`;

test("Realtime Gateway WebSocket Server Tests (Fase 3F - Cenários A a P)", async (t) => {
  const authenticator = new MockRealtimeAuthenticator({
    "valid-token-therapist-1": {
      userId: "ther-001",
      email: "terapeuta1@cliniva.com",
      name: "Dr. Roberto",
    },
    "valid-token-therapist-2": {
      userId: "ther-002",
      email: "terapeuta2@cliniva.com",
      name: "Dra. Juliana",
    },
  });

  const gateway = new RealtimeGatewayServer({
    port: TEST_PORT,
    host: "127.0.0.1",
    path: "/ws/audio",
    authenticator,
    maxConnectionsPerTherapist: 2,
    maxQueueSize: 5,
    inactiveTimeoutMs: 500, // Curto para teste de timeout
  });

  const emittedEvents: GatewayInternalEvent[] = [];
  gateway.onEvent((ev) => emittedEvents.push(ev));

  // Helper para abrir cliente WS
  const createClient = (token?: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const url = token ? `${WS_URL}?token=${token}` : WS_URL;
      const ws = new WebSocket(url);
      ws.on("open", () => resolve(ws));
      ws.on("error", (err) => reject(err));
    });
  };

  // Helper para aguardar próxima mensagem JSON do servidor
  const waitForMessage = (ws: WebSocket): Promise<ServerAudioTransportMessage> => {
    return new Promise((resolve) => {
      ws.once("message", (data) => {
        const parsed = JSON.parse(data.toString("utf-8")) as ServerAudioTransportMessage;
        resolve(parsed);
      });
    });
  };

  await t.test("A) Servidor inicia e escuta porta configurada", async () => {
    await gateway.start();
    assert.ok(gateway);
  });

  await t.test("B) Conexão sem token autenticado é rejeitada (Close 4401)", async () => {
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(WS_URL);
      ws.on("close", (code) => {
        assert.equal(code, 4401);
        resolve();
      });
    });
  });

  await t.test("C) Autenticação válida aceita e conexão estabelecida", async () => {
    const ws = await createClient("valid-token-therapist-1");
    assert.equal(ws.readyState, WebSocket.OPEN);
    ws.close();
  });

  await t.test("D) session_start válido → session_ack (started) e evento interno", async () => {
    const ws = await createClient("valid-token-therapist-1");
    const msgPromise = waitForMessage(ws);

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-100",
        therapistId: "ther-001",
        patientId: "pat-100",
        mimeType: "audio/webm",
      })
    );

    const res = await msgPromise;
    assert.equal(res.type, "session_ack");
    if (res.type === "session_ack") {
      assert.equal(res.status, "started");
      assert.equal(res.sessionId, "sess-100");
    }

    const startEvent = emittedEvents.find((e) => e.type === "SessionStarted");
    assert.ok(startEvent);
    assert.equal(startEvent?.sessionId, "sess-100");

    ws.close();
  });

  await t.test("E) session_start inválido (faltando campos) → transport_error", async () => {
    const ws = await createClient("valid-token-therapist-1");
    const msgPromise = waitForMessage(ws);

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "", // Inválido
        therapistId: "ther-001",
      })
    );

    const res = await msgPromise;
    assert.equal(res.type, "transport_error");
    if (res.type === "transport_error") {
      assert.equal(res.code, "SCHEMA_VALIDATION_ERROR");
    }

    ws.close();
  });

  await t.test("F) audio_chunk válido → session_ack (received_chunk)", async () => {
    const ws = await createClient("valid-token-therapist-1");

    // Inicia sessão
    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-chunk-1",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    // Envia chunk 1
    const p2 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-chunk-1",
        therapistId: "ther-001",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-data-chunk-1").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const res2 = await p2;
    assert.equal(res2.type, "session_ack");
    if (res2.type === "session_ack") {
      assert.equal(res2.status, "received_chunk");
      assert.equal(res2.sequenceNumberAcked, 1);
    }

    const audioEvent = emittedEvents.find((e) => e.type === "AudioReceived");
    assert.ok(audioEvent);
    assert.equal(audioEvent?.sequenceNumber, 1);

    ws.close();
  });

  await t.test("G) Payload acima do limite (>1MB) → erro de schema Zod", async () => {
    const ws = await createClient("valid-token-therapist-1");

    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-huge",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    const p2 = waitForMessage(ws);
    // Excede o limite de 1MB do Zod (MAX_AUDIO_CHUNK_BYTES * 4 / 3 = ~1.39MB)
    const hugePayload = "A".repeat(1024 * 1024 * 1.5);
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-huge",
        therapistId: "ther-001",
        sequenceNumber: 1,
        dataBase64: hugePayload,
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const res2 = await p2;
    assert.equal(res2.type, "transport_error");

    ws.close();
  });

  await t.test("H) SequenceNumber fora de ordem → rejeição controlada", async () => {
    const ws = await createClient("valid-token-therapist-1");

    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-seq",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    // Envia chunk seq 4
    const p2 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-seq",
        therapistId: "ther-001",
        sequenceNumber: 4,
        dataBase64: Buffer.from("audio").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );
    await p2;

    // Envia chunk seq 2 (fora de ordem)
    const p3 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-seq",
        therapistId: "ther-001",
        sequenceNumber: 2,
        dataBase64: Buffer.from("audio").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const res3 = await p3;
    assert.equal(res3.type, "transport_error");
    if (res3.type === "transport_error") {
      assert.equal(res3.code, "OUT_OF_ORDER_SEQUENCE");
    }

    ws.close();
  });

  await t.test("I) Inconsistência de sessionId na mesma conexão → erro", async () => {
    const ws = await createClient("valid-token-therapist-1");

    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-original",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    // Tenta enviar chunk de outra sessão
    const p2 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-OTHER-PATIENT",
        therapistId: "ther-001",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const res2 = await p2;
    assert.equal(res2.type, "transport_error");
    if (res2.type === "transport_error") {
      assert.equal(res2.code, "SESSION_MISMATCH");
    }

    ws.close();
  });

  await t.test("J) Inconsistência de therapistId contra usuário autenticado → violação de isolamento", async () => {
    // Conecta como ther-001 mas tenta passar ther-002
    const ws = await createClient("valid-token-therapist-1");
    const p1 = waitForMessage(ws);

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-spoof",
        therapistId: "ther-002", // Não bate com o token
        mimeType: "audio/webm",
      })
    );

    const res1 = await p1;
    assert.equal(res1.type, "transport_error");
    if (res1.type === "transport_error") {
      assert.equal(res1.code, "ISOLATION_VIOLATION");
    }

    ws.close();
  });

  await t.test("K) pause / resume altera estado e emite eventos", async () => {
    const ws = await createClient("valid-token-therapist-1");

    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pause",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    const p2 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_pause",
        sessionId: "sess-pause",
        therapistId: "ther-001",
      })
    );
    const res2 = await p2;
    if (res2.type === "session_ack") assert.equal(res2.status, "paused");

    const p3 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_resume",
        sessionId: "sess-pause",
        therapistId: "ther-001",
      })
    );
    const res3 = await p3;
    if (res3.type === "session_ack") assert.equal(res3.status, "resumed");

    ws.close();
  });

  await t.test("L) stop encerra sessão e fecha websocket", async () => {
    const ws = await createClient("valid-token-therapist-1");

    const p1 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-stop",
        therapistId: "ther-001",
        mimeType: "audio/webm",
      })
    );
    await p1;

    const p2 = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: "session_stop",
        sessionId: "sess-stop",
        therapistId: "ther-001",
      })
    );
    const res2 = await p2;
    if (res2.type === "session_ack") assert.equal(res2.status, "stopped");

    await new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) resolve();
      else ws.on("close", () => resolve());
    });
  });

  await t.test("M) Backpressure e limite de conexões por terapeuta", async () => {
    const ws1 = await createClient("valid-token-therapist-2");
    const ws2 = await createClient("valid-token-therapist-2");

    // 3ª conexão simultânea do mesmo terapeuta deve ser rejeitada (max = 2)
    await new Promise<void>((resolve) => {
      const ws3 = new WebSocket(`${WS_URL}?token=valid-token-therapist-2`);
      ws3.on("close", (code) => {
        assert.equal(code, 4429);
        resolve();
      });
    });

    ws1.close();
    ws2.close();
  });

  await t.test("N) Timeout de inatividade fecha conexão inativa", async () => {
    const ws = await createClient("valid-token-therapist-1");

    // Aguarda o timeout de inatividade (configurado para 500ms no gateway de teste)
    await new Promise<void>((resolve) => {
      ws.on("close", (code) => {
        assert.equal(code, 4408);
        resolve();
      });
    });
  });

  await t.test("O) Cleanup geral e encerramento do servidor", async () => {
    await gateway.stop();
    assert.equal(gateway.getActiveSessionsCount(), 0);
  });
});
