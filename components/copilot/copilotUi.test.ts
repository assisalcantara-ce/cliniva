import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { CopilotEvent } from "@/lib/copilot/types";
import type { SSEEvent } from "@/lib/copilot/realtime/broker/types";
import type { CopilotEventItem } from "./useCopilotStream";

// Helper to simulate incoming SSE stream events to a mock handler/state manager
class MockCopilotStreamConsumer {
  public state: string = "connecting";
  public transcripts: Array<{ id: string; text: string; isFinal: boolean }> = [];
  public events: CopilotEventItem[] = [];
  public error: string | null = null;
  public maxTranscripts: number = 50;

  public handleSSEMessage(event: SSEEvent) {
    switch (event.type) {
      case "connection_ready":
        this.state = "connected";
        break;
      case "transcript_interim": {
        const interimId = "interim-stream";
        const existingIdx = this.transcripts.findIndex((t) => t.id === interimId);
        const item = {
          id: interimId,
          text: event.text,
          isFinal: false,
        };
        if (existingIdx >= 0) {
          this.transcripts[existingIdx] = item;
        } else {
          this.transcripts.push(item);
        }
        break;
      }
      case "transcript_final": {
        // remove interim
        this.transcripts = this.transcripts.filter((t) => t.id !== "interim-stream");
        this.transcripts.push({
          id: event.chunkId,
          text: event.text,
          isFinal: true,
        });
        if (this.transcripts.length > this.maxTranscripts) {
          this.transcripts = this.transcripts.slice(-this.maxTranscripts);
        }
        break;
      }
      case "copilot_event": {
        const copilotEvt: CopilotEventItem = {
          ...event.event,
          isDismissed: false,
          isPinned: false,
        };
        this.events = [copilotEvt, ...this.events.filter((e) => e.id !== copilotEvt.id)];
        break;
      }
      case "pipeline_error": {
        this.error = event.error;
        this.state = "error";
        break;
      }
      case "session_status": {
        if (event.status === "ended") {
          this.state = "ended";
        }
        break;
      }
    }
  }

  public dismissEvent(eventId: string) {
    this.events = this.events.map((e) =>
      e.id === eventId ? { ...e, isDismissed: true } : e
    );
  }

  public togglePinEvent(eventId: string) {
    this.events = this.events.map((e) =>
      e.id === eventId ? { ...e, isPinned: !e.isPinned } : e
    );
  }

  public getVisibleEvents(maxCards: number = 3): CopilotEventItem[] {
    return this.events
      .filter((e) => !e.isDismissed)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, maxCards);
  }
}

describe("FASE 4B: Copilot UI 2.0 Shell & Client State Machine", () => {
  let consumer: MockCopilotStreamConsumer;

  beforeEach(() => {
    consumer = new MockCopilotStreamConsumer();
  });

  it("Scenario A: Initial connection transition to connected on connection_ready", () => {
    assert.strictEqual(consumer.state, "connecting");
    consumer.handleSSEMessage({
      type: "connection_ready",
      sessionId: "session-123",
      therapistId: "therapist-1",
      timestamp: Date.now(),
      message: "Ready",
    });
    assert.strictEqual(consumer.state, "connected");
  });

  it("Scenario B: Interim transcript updates transient bubble without duplications", () => {
    consumer.handleSSEMessage({
      type: "transcript_interim",
      sessionId: "session-123",
      therapistId: "therapist-1",
      text: "O paciente começou dizendo",
      speaker: "paciente",
      sequenceNumber: 1,
      timestamp: Date.now(),
    });

    assert.strictEqual(consumer.transcripts.length, 1);
    assert.strictEqual(consumer.transcripts[0].text, "O paciente começou dizendo");
    assert.strictEqual(consumer.transcripts[0].isFinal, false);

    consumer.handleSSEMessage({
      type: "transcript_interim",
      sessionId: "session-123",
      therapistId: "therapist-1",
      text: "O paciente começou dizendo que não dormiu bem",
      speaker: "paciente",
      sequenceNumber: 2,
      timestamp: Date.now(),
    });

    assert.strictEqual(consumer.transcripts.length, 1);
    assert.strictEqual(consumer.transcripts[0].text, "O paciente começou dizendo que não dormiu bem");
  });

  it("Scenario C: Final transcript replaces interim and commits permanent bubble", () => {
    consumer.handleSSEMessage({
      type: "transcript_interim",
      sessionId: "session-123",
      therapistId: "therapist-1",
      text: "Falando algo...",
      sequenceNumber: 1,
      timestamp: Date.now(),
    });
    assert.strictEqual(consumer.transcripts.length, 1);

    consumer.handleSSEMessage({
      type: "transcript_final",
      sessionId: "session-123",
      therapistId: "therapist-1",
      chunkId: "chunk-1",
      text: "Falando algo definitivo com sentido.",
      speaker: "paciente",
      sequenceNumber: 1,
      timestamp: Date.now(),
    });

    assert.strictEqual(consumer.transcripts.length, 1);
    assert.strictEqual(consumer.transcripts[0].id, "chunk-1");
    assert.strictEqual(consumer.transcripts[0].isFinal, true);
    assert.strictEqual(consumer.transcripts[0].text, "Falando algo definitivo com sentido.");
  });

  it("Scenario D: Transcript sliding window respects maximum buffer size", () => {
    consumer.maxTranscripts = 5;
    for (let i = 1; i <= 10; i++) {
      consumer.handleSSEMessage({
        type: "transcript_final",
        sessionId: "session-123",
        therapistId: "therapist-1",
        chunkId: `chunk-${i}`,
        text: `Texto ${i}`,
        sequenceNumber: i,
        timestamp: Date.now(),
      });
    }

    assert.strictEqual(consumer.transcripts.length, 5);
    assert.strictEqual(consumer.transcripts[0].id, "chunk-6");
    assert.strictEqual(consumer.transcripts[4].id, "chunk-10");
  });

  it("Scenario E: Ingestion of CopilotEvents respects types and order", () => {
    const event1: CopilotEvent = {
      id: "evt-1",
      type: "EXPLORAR",
      title: "Explorar sentimento de rejeição",
      description: "O paciente associou o feedback do chefe a rejeição precoce.",
      suggestedAction: "Perguntar sobre a experiência inicial com figuras de autoridade",
      evidence: { quote: "me sinto rejeitado quando sou cobrado" },
      createdAt: new Date(Date.now() - 1000).toISOString(),
      urgency: "medium",
    };

    const event2: CopilotEvent = {
      id: "evt-2",
      type: "POTENTIAL_RISK",
      title: "Ponto de atenção: ideação passiva",
      description: "Relato de desamparo e cansaço crônico.",
      evidence: { quote: "não vejo sentido em continuar tentando" },
      createdAt: new Date().toISOString(),
      urgency: "high",
    };

    consumer.handleSSEMessage({
      type: "copilot_event",
      sessionId: "session-123",
      therapistId: "therapist-1",
      event: event1,
      timestamp: Date.now(),
    });
    consumer.handleSSEMessage({
      type: "copilot_event",
      sessionId: "session-123",
      therapistId: "therapist-1",
      event: event2,
      timestamp: Date.now() + 1000,
    });

    assert.strictEqual(consumer.events.length, 2);
    assert.strictEqual(consumer.events[0].id, "evt-2"); // latest first
    assert.strictEqual(consumer.events[1].id, "evt-1");
  });

  it("Scenario F: Maximum 3 active cards displayed in the discrete Copilot feed", () => {
    for (let i = 1; i <= 6; i++) {
      consumer.handleSSEMessage({
        type: "copilot_event",
        sessionId: "session-123",
        therapistId: "therapist-1",
        timestamp: Date.now() + i * 100,
        event: {
          id: `evt-${i}`,
          type: "ACOMPANHAR",
          title: `Tema ${i}`,
          description: `Detalhes ${i}`,
          createdAt: new Date(Date.now() + i * 100).toISOString(),
          urgency: "medium",
        },
      });
    }

    assert.strictEqual(consumer.events.length, 6);
    const visibleCards = consumer.getVisibleEvents(3);
    assert.strictEqual(visibleCards.length, 3);
    assert.strictEqual(visibleCards[0].id, "evt-6");
    assert.strictEqual(visibleCards[1].id, "evt-5");
    assert.strictEqual(visibleCards[2].id, "evt-4");
  });

  it("Scenario G: Dismiss card removes event locally and brings next event into view", () => {
    for (let i = 1; i <= 4; i++) {
      consumer.handleSSEMessage({
        type: "copilot_event",
        sessionId: "session-123",
        therapistId: "therapist-1",
        timestamp: Date.now() + i * 100,
        event: {
          id: `evt-${i}`,
          type: "NOTA",
          title: `Nota ${i}`,
          description: `Detalhe ${i}`,
          createdAt: new Date(Date.now() + i * 100).toISOString(),
          urgency: "low",
        },
      });
    }

    assert.strictEqual(consumer.getVisibleEvents(3)[0].id, "evt-4");
    // Dismiss top card
    consumer.dismissEvent("evt-4");

    const visibleAfterDismiss = consumer.getVisibleEvents(3);
    assert.strictEqual(visibleAfterDismiss.length, 3);
    assert.strictEqual(visibleAfterDismiss[0].id, "evt-3");
    assert.strictEqual(visibleAfterDismiss[1].id, "evt-2");
    assert.strictEqual(visibleAfterDismiss[2].id, "evt-1");
  });

  it("Scenario H: Pinned cards stay anchored at top of visible feed", () => {
    for (let i = 1; i <= 4; i++) {
      consumer.handleSSEMessage({
        type: "copilot_event",
        sessionId: "session-123",
        therapistId: "therapist-1",
        timestamp: Date.now() + i * 100,
        event: {
          id: `evt-${i}`,
          type: "CONEXAO",
          title: `Conexao ${i}`,
          description: `Detalhe ${i}`,
          createdAt: new Date(Date.now() + i * 100).toISOString(),
          urgency: "medium",
        },
      });
    }

    // Pin evt-1 (which was the oldest)
    consumer.togglePinEvent("evt-1");

    const visible = consumer.getVisibleEvents(3);
    assert.strictEqual(visible.length, 3);
    // Pinned comes first
    assert.strictEqual(visible[0].id, "evt-1");
    // Followed by unpinned
    assert.strictEqual(visible[1].id, "evt-4");
    assert.strictEqual(visible[2].id, "evt-3");

    // Unpinning restores normal priority
    consumer.togglePinEvent("evt-1");
    const visibleAfterUnpin = consumer.getVisibleEvents(3);
    assert.strictEqual(visibleAfterUnpin[0].id, "evt-4");
  });

  it("Scenario I: Pipeline error transitions state to error and captures message", () => {
    consumer.handleSSEMessage({
      type: "pipeline_error",
      sessionId: "session-123",
      therapistId: "therapist-1",
      error: "STT quota exceeded on upstream provider",
      timestamp: Date.now(),
    });

    assert.strictEqual(consumer.state, "error");
    assert.strictEqual(consumer.error, "STT quota exceeded on upstream provider");
  });

  it("Scenario J: Session status ended marks state as ended", () => {
    consumer.handleSSEMessage({
      type: "session_status",
      sessionId: "session-123",
      therapistId: "therapist-1",
      status: "ended",
      timestamp: Date.now(),
    });

    assert.strictEqual(consumer.state, "ended");
  });

  it("Scenario K: Silence state when zero events are present", () => {
    assert.strictEqual(consumer.events.length, 0);
    const visibleCards = consumer.getVisibleEvents(3);
    assert.strictEqual(visibleCards.length, 0);
  });
});
