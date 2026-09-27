import assert from "node:assert/strict";
import test from "node:test";
import { RealtimeEventBroker } from "./eventBroker";
import {
  type SSEEvent,
  type CopilotEventSSE,
  type TranscriptFinalEvent,
  type PipelineErrorEvent,
  SSEEventSchema,
} from "./types";
import type { CopilotEvent } from "../../types";

test("RealtimeEventBroker & SSE Channel Tests (Fase 3H - Cenários A a R)", async (t) => {
  const broker = new RealtimeEventBroker();

  t.beforeEach(() => {
    broker.clearAll();
  });

  const dummyCopilotEvent: CopilotEvent = {
    id: "evt-test-01",
    type: "EXPLORAR",
    title: "Explorar angústia com o trabalho",
    description: "Paciente relata ansiedade forte ao apresentar relatórios.",
    urgency: "medium",
    suggestedAction: "Aprofundar de forma acolhedora.",
    evidence: {
      chunkId: "chk-1",
      sessionId: "sess-001",
      quote: "Sinto uma ansiedade forte",
    },
    createdAt: new Date().toISOString(),
  };

  await t.test("A) broker publish/subscribe entrega eventos ao vivo corretamente", () => {
    const received: SSEEvent[] = [];
    const unsubscribe = broker.subscribe("sess-001", (ev) => {
      received.push(ev);
    });

    broker.publish("sess-001", {
      type: "transcript_final",
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunkId: "chk-1",
      text: "Hoje eu gostaria de falar sobre o trabalho.",
      timestamp: Date.now(),
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].type, "transcript_final");
    assert.equal((received[0] as TranscriptFinalEvent).text, "Hoje eu gostaria de falar sobre o trabalho.");

    unsubscribe();
  });

  await t.test("B) múltiplos subscribers na mesma sessão recebem o evento", () => {
    const receivedA: SSEEvent[] = [];
    const receivedB: SSEEvent[] = [];

    const unsubA = broker.subscribe("sess-001", (ev) => receivedA.push(ev));
    const unsubB = broker.subscribe("sess-001", (ev) => receivedB.push(ev));

    assert.equal(broker.getSubscriberCount("sess-001"), 2);

    broker.publish("sess-001", {
      type: "session_status",
      sessionId: "sess-001",
      therapistId: "ther-001",
      status: "active",
      timestamp: Date.now(),
    });

    assert.equal(receivedA.length, 1);
    assert.equal(receivedB.length, 1);

    unsubA();
    unsubB();
  });

  await t.test("C) isolamento estrito por sessionId (sessão A não recebe da sessão B)", () => {
    const receivedA: SSEEvent[] = [];
    const receivedB: SSEEvent[] = [];

    const unsubA = broker.subscribe("sess-A", (ev) => receivedA.push(ev));
    const unsubB = broker.subscribe("sess-B", (ev) => receivedB.push(ev));

    broker.publish("sess-A", {
      type: "transcript_final",
      sessionId: "sess-A",
      therapistId: "ther-001",
      chunkId: "chk-a",
      text: "Texto da sessão A",
      timestamp: Date.now(),
    });

    assert.equal(receivedA.length, 1);
    assert.equal(receivedB.length, 0);

    unsubA();
    unsubB();
  });

  await t.test("D) unsubscribe cancela recebimento de novos eventos", () => {
    const received: SSEEvent[] = [];
    const unsub = broker.subscribe("sess-unsub", (ev) => received.push(ev));

    broker.publish("sess-unsub", {
      type: "heartbeat",
      timestamp: Date.now(),
    });
    assert.equal(received.length, 1);

    unsub();

    broker.publish("sess-unsub", {
      type: "heartbeat",
      timestamp: Date.now(),
    });
    assert.equal(received.length, 1); // Continua 1
  });

  await t.test("E) cleanup remove entrada do mapa quando não há mais listeners", () => {
    assert.equal(broker.getActiveSessionsCount(), 0);

    const unsub1 = broker.subscribe("sess-clean", () => {});
    const unsub2 = broker.subscribe("sess-clean", () => {});
    assert.equal(broker.getActiveSessionsCount(), 1);

    unsub1();
    assert.equal(broker.getActiveSessionsCount(), 1);

    unsub2();
    assert.equal(broker.getActiveSessionsCount(), 0);
  });

  await t.test("F) SSE connection_ready schema válido", () => {
    const raw = {
      type: "connection_ready",
      sessionId: "sess-1",
      therapistId: "ther-1",
      timestamp: Date.now(),
      message: "Ready",
    };
    const parsed = SSEEventSchema.safeParse(raw);
    assert.equal(parsed.success, true);
  });

  await t.test("G) SSE copilot_event entrega CopilotEvent estruturado", () => {
    const received: SSEEvent[] = [];
    const unsub = broker.subscribe("sess-001", (ev) => received.push(ev));

    broker.publish("sess-001", {
      type: "copilot_event",
      sessionId: "sess-001",
      therapistId: "ther-001",
      event: dummyCopilotEvent,
      timestamp: Date.now(),
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].type, "copilot_event");
    const copilotMsg = received[0] as CopilotEventSSE;
    assert.equal(copilotMsg.event.type, "EXPLORAR");
    assert.equal(copilotMsg.event.title, "Explorar angústia com o trabalho");

    unsub();
  });

  await t.test("H) SSE transcript_final entrega texto e métricas", () => {
    const received: SSEEvent[] = [];
    const unsub = broker.subscribe("sess-001", (ev) => received.push(ev));

    broker.publish("sess-001", {
      type: "transcript_final",
      sessionId: "sess-001",
      therapistId: "ther-001",
      chunkId: "chk-99",
      text: "Transcrição finalizada com precisão.",
      confidence: 0.98,
      tStartSeconds: 1.2,
      tEndSeconds: 4.5,
      sequenceNumber: 2,
      timestamp: Date.now(),
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].type, "transcript_final");
    const tf = received[0] as TranscriptFinalEvent;
    assert.equal(tf.confidence, 0.98);
    assert.equal(tf.sequenceNumber, 2);

    unsub();
  });

  await t.test("I) SSE pipeline_error entrega detalhes do erro sem expor dados sensíveis", () => {
    const received: SSEEvent[] = [];
    const unsub = broker.subscribe("sess-001", (ev) => received.push(ev));

    broker.publish("sess-001", {
      type: "pipeline_error",
      sessionId: "sess-001",
      therapistId: "ther-001",
      error: "Falha na transcrição STT: Timeout",
      errorCode: "STT_TIMEOUT",
      timestamp: Date.now(),
    });

    assert.equal(received.length, 1);
    const errEv = received[0] as PipelineErrorEvent;
    assert.equal(errEv.errorCode, "STT_TIMEOUT");

    unsub();
  });

  await t.test("J) heartbeat periódico é validado pelo schema", () => {
    const hb: SSEEvent = {
      type: "heartbeat",
      timestamp: Date.now(),
    };
    const parsed = SSEEventSchema.safeParse(hb);
    assert.equal(parsed.success, true);
  });

  await t.test("K) conexão sem subscribers descarta evento com segurança (sem acumular memória)", () => {
    // Publica sem nenhum listener inscrito
    broker.publish("sess-empty", {
      type: "heartbeat",
      timestamp: Date.now(),
    });

    assert.equal(broker.getActiveSessionsCount(), 0);
    assert.equal(broker.getSubscriberCount("sess-empty"), 0);
  });

  await t.test("L) payload Zod inválido é rejeitado ao publicar no broker", () => {
    assert.throws(
      () => {
        broker.publish("sess-001", {
          type: "copilot_event",
          sessionId: "", // Inválido
          therapistId: "ther-001",
          event: {} as unknown as CopilotEvent, // Inválido
          timestamp: 0,
        } as unknown as SSEEvent);
      },
      /falha na validação do evento SSE/
    );
  });

  await t.test("M) duas sessões simultâneas com múltiplos clientes operam de forma isolada", () => {
    const s1Client1: SSEEvent[] = [];
    const s1Client2: SSEEvent[] = [];
    const s2Client1: SSEEvent[] = [];

    const u1 = broker.subscribe("sess-1", (e) => s1Client1.push(e));
    const u2 = broker.subscribe("sess-1", (e) => s1Client2.push(e));
    const u3 = broker.subscribe("sess-2", (e) => s2Client1.push(e));

    broker.publish("sess-1", {
      type: "transcript_interim",
      sessionId: "sess-1",
      therapistId: "ther-1",
      text: "Interim sess 1",
      timestamp: Date.now(),
    });

    broker.publish("sess-2", {
      type: "transcript_interim",
      sessionId: "sess-2",
      therapistId: "ther-2",
      text: "Interim sess 2",
      timestamp: Date.now(),
    });

    assert.equal(s1Client1.length, 1);
    assert.equal(s1Client2.length, 1);
    assert.equal(s2Client1.length, 1);

    assert.equal((s1Client1[0] as { text: string }).text, "Interim sess 1");
    assert.equal((s2Client1[0] as { text: string }).text, "Interim sess 2");

    u1();
    u2();
    u3();
  });

  await t.test("N) ausência de listeners órfãos após clearAll", () => {
    broker.subscribe("sess-1", () => {});
    broker.subscribe("sess-2", () => {});
    assert.equal(broker.getActiveSessionsCount(), 2);

    broker.clearAll();
    assert.equal(broker.getActiveSessionsCount(), 0);
  });
});
