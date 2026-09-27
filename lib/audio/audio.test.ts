import assert from "node:assert/strict";
import test from "node:test";
import { getSupportedAudioMimeType, audioChunkToBuffer } from "./mimeHelper";
import { AudioCapture } from "./audioCapture";
import type { AudioChunk, AudioCaptureState } from "./types";

test("AudioCapture & Browser Audio Layer Tests (Fase 3D - Cenários A a G)", async (t) => {
  const originalMediaDevices = globalThis.navigator?.mediaDevices;

  t.afterEach(() => {
    if (globalThis.navigator && originalMediaDevices) {
      Object.defineProperty(globalThis.navigator, "mediaDevices", {
        value: originalMediaDevices,
        configurable: true,
        writable: true,
      });
    }
  });

  await t.test("A) getSupportedAudioMimeType seleciona primeiro formato suportado", () => {
    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: {
        isTypeSupported: (type: string) => type === "audio/webm;codecs=opus",
      },
    };

    const selected = getSupportedAudioMimeType(["audio/webm;codecs=opus", "audio/mp4"]);
    assert.equal(selected, "audio/webm;codecs=opus");
  });

  await t.test("B) getSupportedAudioMimeType faz fallback se nenhum preferencial for suportado", () => {
    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: {
        isTypeSupported: () => false,
      },
    };

    const selected = getSupportedAudioMimeType(["audio/wav"]);
    assert.equal(selected, "");
  });

  await t.test("C) AudioCapture inicializa com estado inactive e configurações padrão", () => {
    const capture = new AudioCapture({ timeSliceMs: 3000, channelCount: 1 });
    assert.equal(capture.state, "inactive");
  });

  await t.test("D) AudioCapture lifecycle completo com mock MediaRecorder (start, chunk, pause, resume, stop)", async () => {
    let trackStopped = false;
    const mockTrack = {
      stop: () => {
        trackStopped = true;
      },
    };

    const mockStream = {
      getTracks: () => [mockTrack],
    };

    class FakeMediaRecorder {
      public state: "inactive" | "recording" | "paused" = "inactive";
      public mimeType = "audio/webm;codecs=opus";
      public ondataavailable: ((e: { data: Blob }) => void) | null = null;
      public onerror: ((e: unknown) => void) | null = null;

      constructor(public stream: unknown, public options: unknown) {}

      public start() {
        this.state = "recording";
      }

      public pause() {
        this.state = "paused";
      }

      public resume() {
        this.state = "recording";
      }

      public stop() {
        this.state = "inactive";
      }

      public emitFakeChunk(blob: Blob) {
        if (this.ondataavailable) {
          this.ondataavailable({ data: blob });
        }
      }
    }

    let fakeRecorderInstance: { emitFakeChunk: (blob: Blob) => void } | null = null;

    // Configura ambiente global simulado
    (globalThis as unknown as { window: unknown }).window = {
      MediaRecorder: FakeMediaRecorder,
    };

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => mockStream,
      },
      configurable: true,
      writable: true,
    });

    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = function (s: unknown, o: unknown) {
      const inst = new FakeMediaRecorder(s, o);
      fakeRecorderInstance = inst;
      return inst;
    };

    const receivedChunks: AudioChunk[] = [];
    const stateChanges: AudioCaptureState[] = [];

    const capture = new AudioCapture(
      { timeSliceMs: 2000, channelCount: 1 },
      {
        onChunk: (c) => receivedChunks.push(c),
        onStateChange: (s) => stateChanges.push(s),
      }
    );

    // 1. Inicia
    await capture.start();
    assert.equal(capture.state, "recording");
    assert.ok(stateChanges.includes("recording"));

    // 2. Emite chunks simulados
    const dummyBlob1 = new Blob(["audio-data-chunk-1"], { type: "audio/webm" });
    if (fakeRecorderInstance) {
      (fakeRecorderInstance as FakeMediaRecorder).emitFakeChunk(dummyBlob1);
    }

    const dummyBlob2 = new Blob(["audio-data-chunk-2"], { type: "audio/webm" });
    if (fakeRecorderInstance) {
      (fakeRecorderInstance as FakeMediaRecorder).emitFakeChunk(dummyBlob2);
    }

    assert.equal(receivedChunks.length, 2);
    assert.equal(receivedChunks[0].sequenceNumber, 1);
    assert.equal(receivedChunks[1].sequenceNumber, 2);
    assert.equal(receivedChunks[0].mimeType, "audio/webm");

    // 3. Pausa e Retoma
    capture.pause();
    assert.equal(capture.state, "paused");

    capture.resume();
    assert.equal(capture.state, "recording");

    // 4. Para e limpa recursos
    capture.stop();
    assert.equal(capture.state, "inactive");
    assert.equal(trackStopped, true, "MediaStream tracks devem ser paradas no stop");
  });

  await t.test("E) Trata rejeição de permissão de microfone de forma controlada", async () => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          const err = new Error("Permission denied");
          err.name = "NotAllowedError";
          throw err;
        },
      },
      configurable: true,
      writable: true,
    });

    let errorEmitted: Error | null = null;
    const capture = new AudioCapture(
      {},
      {
        onError: (err) => {
          errorEmitted = err;
        },
      }
    );

    await assert.rejects(
      async () => {
        await capture.start();
      },
      /Permissão de microfone negada/
    );

    assert.equal(capture.state, "error");
    assert.ok(errorEmitted !== null);
  });

  await t.test("F) Trata ausência de getUserMedia no ambiente", async () => {
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const capture = new AudioCapture();
    await assert.rejects(
      async () => {
        await capture.start();
      },
      /Ambiente ou navegador não suporta captura de microfone/
    );
    assert.equal(capture.state, "error");
  });

  await t.test("G) audioChunkToBuffer converte Blob para ArrayBuffer com sucesso", async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([testData]);

    const buffer = await audioChunkToBuffer(blob);
    assert.equal(buffer.byteLength, 5);
    const view = new Uint8Array(buffer);
    assert.deepEqual(Array.from(view), [1, 2, 3, 4, 5]);
  });
});
