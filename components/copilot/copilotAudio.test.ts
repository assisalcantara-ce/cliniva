import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AudioCapture } from "@/lib/audio/audioCapture";
import { WebSocketAudioTransport } from "@/lib/audio/transport/websocketTransport";
import { audioChunkToBase64 } from "@/lib/audio/mimeHelper";
import type { AudioTransportState, ServerAudioTransportMessage } from "@/lib/audio/transport/types";

// Mock WebSocket implementation for client-side transport tests
class FakeWebSocketClient {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public static instances: FakeWebSocketClient[] = [];
  public readyState: number = 0; // CONNECTING
  public url: string;
  public onopen: (() => void) | null = null;
  public onmessage: ((e: { data: string }) => void) | null = null;
  public onerror: ((e: unknown) => void) | null = null;
  public onclose: ((e: { code: number; reason: string }) => void) | null = null;
  public sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocketClient.instances.push(this);
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 10);
  }

  public send(data: string) {
    this.sentMessages.push(data);
  }

  public close(code = 1000, reason = "") {
    this.readyState = 3; // CLOSED
    this.onclose?.({ code, reason });
  }

  public simulateServerMessage(msg: ServerAudioTransportMessage) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

describe("FASE 4C: Real Audio Pipeline & Copilot UI 2.0 Integration Tests", () => {
  const originalWs = (globalThis as unknown as { WebSocket: unknown }).WebSocket;
  const originalNavigator = globalThis.navigator;
  const originalMediaRecorder = (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder;

  class FakeMediaRecorder {
    public state: "inactive" | "recording" | "paused" = "inactive";
    public mimeType = "audio/webm;codecs=opus";
    public ondataavailable: ((e: { data: Blob }) => void) | null = null;
    public onerror: ((e: unknown) => void) | null = null;

    constructor(public stream: unknown, public options: unknown) {}
    public start() {
      this.state = "recording";
    }
    public stop() {
      this.state = "inactive";
    }
    public pause() {
      this.state = "paused";
    }
    public resume() {
      this.state = "recording";
    }
  }

  beforeEach(() => {
    FakeWebSocketClient.instances = [];
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocketClient;
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeMediaRecorder;
    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: FakeMediaRecorder,
    };
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWs;
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = originalMediaRecorder;
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it("A) start → microphone: AudioCapture initializes and requests microphone cleanly", async () => {
    let getUserMediaCalled = false;
    const fakeStream = {
      getTracks: () => [{ stop: () => {} }],
    };

    const fakeNavigator = {
      mediaDevices: {
        getUserMedia: async () => {
          getUserMediaCalled = true;
          return fakeStream;
        },
      },
    };

    Object.defineProperty(globalThis, "navigator", {
      value: fakeNavigator,
      configurable: true,
      writable: true,
    });

    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: class {
        public mimeType = "audio/webm;codecs=opus";
        public start() {}
        public stop() {}
        public pause() {}
        public resume() {}
        public ondataavailable: unknown = null;
        public onerror: unknown = null;
        public state = "recording";
      },
    };

    const capture = new AudioCapture({ timeSliceMs: 4000 });
    await capture.start();

    assert.strictEqual(getUserMediaCalled, true);
    assert.strictEqual(capture.state, "recording");
    capture.destroy();
    assert.strictEqual(capture.state, "inactive");
  });

  it("B) start → transport: WebSocketAudioTransport connects to gateway endpoint", async () => {
    const states: AudioTransportState[] = [];
    const transport = new WebSocketAudioTransport(
      {
        sessionId: "session-4c-01",
        therapistId: "therapist-4c-01",
        endpointUrl: "ws://localhost:8080/ws/audio",
      },
      {
        onStateChange: (s) => states.push(s),
      }
    );

    await transport.connect();
    assert.strictEqual(transport.state, "connected");
    assert.ok(states.includes("connecting"));
    assert.ok(states.includes("connected"));
    transport.disconnect();
    assert.strictEqual(transport.state, "disconnected");
  });

  it("C) session_start: sends schema-valid start payload upon session initiation", async () => {
    const transport = new WebSocketAudioTransport({
      sessionId: "session-4c-02",
      therapistId: "therapist-4c-02",
      patientId: "patient-4c-02",
      endpointUrl: "ws://localhost:8080/ws/audio",
    });

    await transport.connect();
    transport.send({
      type: "session_start",
      sessionId: "session-4c-02",
      therapistId: "therapist-4c-02",
      patientId: "patient-4c-02",
      mimeType: "audio/webm;codecs=opus",
      sampleRate: 16000,
      channelCount: 1,
      timestamp: Date.now(),
    });

    const wsInstance = FakeWebSocketClient.instances[0];
    assert.ok(wsInstance);
    assert.strictEqual(wsInstance.sentMessages.length, 1);

    const parsed = JSON.parse(wsInstance.sentMessages[0]);
    assert.strictEqual(parsed.type, "session_start");
    assert.strictEqual(parsed.sessionId, "session-4c-02");
    assert.strictEqual(parsed.mimeType, "audio/webm;codecs=opus");
    transport.disconnect();
  });

  it("D) audio_chunk: serializes AudioChunk Blob to base64 and preserves sequence", async () => {
    const fakeBlob = {
      arrayBuffer: async () => new TextEncoder().encode("fake-audio-pcm-data").buffer,
    } as unknown as Blob;

    const base64 = await audioChunkToBase64(fakeBlob);
    assert.strictEqual(typeof base64, "string");
    assert.strictEqual(Buffer.from(base64, "base64").toString(), "fake-audio-pcm-data");

    const transport = new WebSocketAudioTransport({
      sessionId: "session-4c-03",
      therapistId: "therapist-4c-03",
    });

    await transport.connect();
    transport.send({
      type: "audio_chunk",
      sessionId: "session-4c-03",
      therapistId: "therapist-4c-03",
      sequenceNumber: 1,
      dataBase64: base64,
      mimeType: "audio/webm;codecs=opus",
      timestamp: Date.now(),
    });

    const wsInstance = FakeWebSocketClient.instances[0];
    assert.strictEqual(wsInstance.sentMessages.length, 1);
    const parsed = JSON.parse(wsInstance.sentMessages[0]);
    assert.strictEqual(parsed.type, "audio_chunk");
    assert.strictEqual(parsed.sequenceNumber, 1);
    assert.strictEqual(parsed.dataBase64, base64);
    transport.disconnect();
  });

  it("E) pause: sends session_pause and transitions state to paused", async () => {
    const states: AudioTransportState[] = [];
    const transport = new WebSocketAudioTransport(
      {
        sessionId: "session-4c-04",
        therapistId: "therapist-4c-04",
      },
      {
        onStateChange: (s) => states.push(s),
      }
    );

    await transport.connect();
    transport.send({
      type: "session_pause",
      sessionId: "session-4c-04",
      therapistId: "therapist-4c-04",
      timestamp: Date.now(),
    });

    assert.strictEqual(transport.state, "paused");
    assert.ok(states.includes("paused"));
    transport.disconnect();
  });

  it("F) resume: sends session_resume and restores state to connected", async () => {
    const transport = new WebSocketAudioTransport({
      sessionId: "session-4c-05",
      therapistId: "therapist-4c-05",
    });

    await transport.connect();
    transport.send({
      type: "session_pause",
      sessionId: "session-4c-05",
      therapistId: "therapist-4c-05",
    });
    assert.strictEqual(transport.state, "paused");

    transport.send({
      type: "session_resume",
      sessionId: "session-4c-05",
      therapistId: "therapist-4c-05",
    });
    assert.strictEqual(transport.state, "connected");
    transport.disconnect();
  });

  it("G) stop: sends session_stop and disconnects WebSocket", async () => {
    const transport = new WebSocketAudioTransport({
      sessionId: "session-4c-06",
      therapistId: "therapist-4c-06",
    });

    await transport.connect();
    transport.send({
      type: "session_stop",
      sessionId: "session-4c-06",
      therapistId: "therapist-4c-06",
    });
    assert.strictEqual(transport.state, "disconnected");
  });

  it("H) microphone permission denied: captures error gracefully without crashing session", async () => {
    let capturedError: Error | null = null;
    const fakeNavigator = {
      mediaDevices: {
        getUserMedia: async () => {
          const err = new Error("Permission denied");
          err.name = "NotAllowedError";
          throw err;
        },
      },
    };

    Object.defineProperty(globalThis, "navigator", {
      value: fakeNavigator,
      configurable: true,
      writable: true,
    });

    const capture = new AudioCapture(
      { timeSliceMs: 4000 },
      {
        onError: (err) => {
          capturedError = err;
        },
      }
    );

    await assert.rejects(async () => {
      await capture.start();
    }, /Permissão de microfone negada/);

    assert.strictEqual(capture.state, "error");
    assert.ok(capturedError);
    assert.match((capturedError as Error).message, /Permissão de microfone negada/);
  });

  it("I) WebSocket error: notifies onError and transitions state to error", async () => {
    let capturedErr: Error | null = null;
    const transport = new WebSocketAudioTransport(
      {
        sessionId: "session-4c-07",
        therapistId: "therapist-4c-07",
      },
      {
        onError: (err) => {
          capturedErr = err;
        },
      }
    );

    await transport.connect();
    const wsInstance = FakeWebSocketClient.instances[0];
    wsInstance.simulateServerMessage({
      type: "transport_error",
      sessionId: "session-4c-07",
      therapistId: "therapist-4c-07",
      code: "QUOTA_EXCEEDED",
      message: "Limite atingido",
      timestamp: Date.now(),
    });

    assert.strictEqual(transport.state, "error");
    assert.ok(capturedErr);
    assert.match((capturedErr as Error).message, /QUOTA_EXCEEDED/);
    transport.disconnect();
  });

  it("J) reconnect: auto-reconnect schedules retry on unexpected disconnection", async () => {
    const states: AudioTransportState[] = [];
    const transport = new WebSocketAudioTransport(
      {
        sessionId: "session-4c-08",
        therapistId: "therapist-4c-08",
        autoReconnect: true,
      },
      {
        onStateChange: (s) => states.push(s),
      }
    );

    await transport.connect();
    const wsInstance = FakeWebSocketClient.instances[0];
    // Simulate abnormal close (code 1006)
    wsInstance.close(1006, "Abnormal closure");

    assert.strictEqual(transport.state, "connecting"); // transitioning to reconnect
    transport.disconnect();
  });

  it("K) cleanup: releases audio tracks and closes socket cleanly", async () => {
    let trackStopped = false;
    const fakeStream = {
      getTracks: () => [
        {
          stop: () => {
            trackStopped = true;
          },
        },
      ],
    };

    const fakeNavigator = {
      mediaDevices: {
        getUserMedia: async () => fakeStream,
      },
    };

    Object.defineProperty(globalThis, "navigator", {
      value: fakeNavigator,
      configurable: true,
      writable: true,
    });

    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: class {
        public mimeType = "audio/webm";
        public start() {}
        public stop() {}
        public state = "recording";
      },
    };

    const capture = new AudioCapture();
    await capture.start();
    assert.strictEqual(capture.state, "recording");

    capture.destroy();
    assert.strictEqual(trackStopped, true);
    assert.strictEqual(capture.state, "inactive");
  });
});
