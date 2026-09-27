import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { RealtimeGatewayServer } from "./server";
import { MockRealtimeAuthenticator } from "./authenticator";
import { RealtimePipelineOrchestrator, type PipelineOutputEvent } from "./pipelineOrchestrator";
import { MockSTTProvider } from "../../lib/stt/providers/mock";
import type { STTInput, STTProvider, STTTranscriptResult } from "../../lib/stt/types";
import { normalizeSTTResult } from "../../lib/stt/normalizer";

const TEST_PORT = 9299;
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws/audio`;

test("Realtime Pipeline Orchestrator Tests (Fase 3G - Cenários A a L)", async (t) => {
  const authenticator = new MockRealtimeAuthenticator({
    "token-pipeline-1": {
      userId: "ther-pipeline-1",
      email: "therapist@cliniva.com",
      name: "Dr. Pipeline",
    },
  });

  const gateway = new RealtimeGatewayServer({
    port: TEST_PORT,
    host: "127.0.0.1",
    path: "/ws/audio",
    authenticator,
  });

  // Provedor Mock customizável para testes controlados de STT
  class TestControlledSTTProvider implements STTProvider {
    public readonly id = "controlled-stt";
    public readonly name = "Controlled STT Provider";
    public readonly capabilities = {
      supportsStreaming: false,
      supportsInterimResults: false,
      supportsSpeakerDiarization: true,
      supportsTimestamps: true,
      supportsWordLevelConfidence: true,
      supportedAudioFormats: ["audio/webm"],
    };

    public nextTranscriptText: string = "Texto padrão de teste.";
    public shouldFail: boolean = false;
    public delayMs: number = 0;

    public async transcribeChunk(input: STTInput): Promise<STTTranscriptResult> {
      if (this.delayMs > 0) {
        await new Promise((r) => setTimeout(r, this.delayMs));
      }
      if (this.shouldFail) {
        throw new Error("Erro simulado no provedor STT.");
      }

      return normalizeSTTResult({
        id: `chunk-stt-${input.sequenceNumber ?? 1}`,
        sessionId: input.sessionId,
        therapistId: input.therapistId,
        patientId: input.patientId,
        text: this.nextTranscriptText,
        speaker: "paciente",
        isFinal: true,
        sequenceNumber: input.sequenceNumber,
        timestamp: input.timestamp,
      });
    }
  }

  const controlledSTT = new TestControlledSTTProvider();

  // Runner determinístico para testes desacoplados de LLM
  const deterministicRunner = async (
    context: import("../../lib/copilot/types").CopilotContext
  ): Promise<import("../../lib/copilot/types").CopilotEvent[]> => {
    const { eventEngine } = await import("../../lib/copilot/eventEngine");
    const evaluation = eventEngine.evaluateContext(context);
    const latest = context.recentChunks[context.recentChunks.length - 1];
    if (!latest || !evaluation.shouldEvaluateLlm) return [];

    return [
      {
        id: `evt-${latest.id}`,
        type: evaluation.priorityType ?? "EXPLORAR",
        title: `Evento ${evaluation.priorityType}: ${evaluation.matchedKeywords?.join(" ") ?? "clínico"}`,
        description: evaluation.reason ?? "Descrição do evento gerado com detalhamento clínico.",
        urgency: evaluation.urgency ?? "medium",
        suggestedAction: "Aprofundar o relato do paciente de forma acolhedora.",
        evidence: {
          chunkId: latest.id,
          quote: latest.text,
        },
        createdAt: new Date().toISOString(),
      },
    ];
  };

  const orchestrator = new RealtimePipelineOrchestrator({
    sttProvider: controlledSTT,
    sttTimeoutMs: 300, // Curto para teste de timeout
    customEngineRunner: deterministicRunner,
  });

  orchestrator.attachToGateway(gateway);

  const pipelineOutputs: PipelineOutputEvent[] = [];
  orchestrator.onOutput((ev) => pipelineOutputs.push(ev));

  const createClient = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?token=token-pipeline-1`);
      ws.on("open", () => resolve(ws));
      ws.on("error", (err) => reject(err));
    });
  };

  const waitForOutput = (
    predicate: (e: PipelineOutputEvent) => boolean,
    timeoutMs = 1500
  ): Promise<PipelineOutputEvent> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout aguardando evento do pipeline após ${timeoutMs}ms`));
      }, timeoutMs);

      const check = () => {
        const found = pipelineOutputs.find(predicate);
        if (found) {
          clearTimeout(timer);
          resolve(found);
          return true;
        }
        return false;
      };

      if (!check()) {
        const unsubscribe = orchestrator.onOutput((e) => {
          if (predicate(e)) {
            clearTimeout(timer);
            unsubscribe();
            resolve(e);
          }
        });
      }
    });
  };

  // 1. Inicia servidor e gateway
  await gateway.start();

  await t.test("A) audio_chunk → STT → transcript_ready emitido com sucesso", async () => {
    controlledSTT.nextTranscriptText = "Olá doutor, boa tarde.";
    controlledSTT.shouldFail = false;
    controlledSTT.delayMs = 0;

    const ws = await createClient();

    // Inicia sessão
    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pipe-1",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    // Envia chunk 1
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-pipe-1",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-data-chunk-1").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const event = await waitForOutput(
      (e) => e.type === "transcript_ready" && e.sessionId === "sess-pipe-1"
    );

    assert.equal(event.type, "transcript_ready");
    assert.equal(event.text, "Olá doutor, boa tarde.");
    assert.equal(event.sequenceNumber, 1);

    ws.close();
  });

  await t.test("B) transcript alimenta RealtimeCopilotProcessor e instancia sessão ativa", async () => {
    const session = orchestrator.getSession("sess-pipe-1");
    assert.ok(session);
    assert.equal(session?.copilotProcessor.getProcessedChunksCount(), 1);
  });

  await t.test("C) Evento Copilot válido é produzido (EXPLORAR em queixa de afeto/angústia)", async () => {
    controlledSTT.nextTranscriptText =
      "Eu sinto uma forte ansiedade e um medo constante ao tentar falar com meu chefe.";

    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pipe-events",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-pipe-events",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-bytes").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const copilotEvent = await waitForOutput(
      (e) => e.type === "copilot_events_ready" && e.sessionId === "sess-pipe-events"
    );

    assert.equal(copilotEvent.type, "copilot_events_ready");
    assert.ok(copilotEvent.newEvents && copilotEvent.newEvents.length > 0);
    assert.equal(copilotEvent.newEvents?.[0]?.type, "EXPLORAR");

    ws.close();
  });

  await t.test("D) Silêncio do DecisionEngine (conversa cotidiana trivial) não emite eventos Copilot", async () => {
    controlledSTT.nextTranscriptText = "Sim, o tempo hoje está bastante ensolarado.";

    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pipe-silence",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-pipe-silence",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-bytes").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    // Aguarda o transcript_ready
    await waitForOutput(
      (e) => e.type === "transcript_ready" && e.sessionId === "sess-pipe-silence"
    );

    // Confirma que NÃO foi emitido copilot_events_ready para esta sessão
    const eventsForSession = pipelineOutputs.filter(
      (e) => e.sessionId === "sess-pipe-silence" && e.type === "copilot_events_ready"
    );
    assert.equal(eventsForSession.length, 0);

    ws.close();
  });

  await t.test("E) STT Timeout é tratado de forma resiliente sem quebrar o Gateway", async () => {
    controlledSTT.delayMs = 600; // Maior que sttTimeoutMs (300ms)

    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pipe-timeout",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-pipe-timeout",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-bytes").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const errorEvent = await waitForOutput(
      (e) => e.type === "pipeline_error" && e.sessionId === "sess-pipe-timeout"
    );

    assert.equal(errorEvent.type, "pipeline_error");
    assert.equal(errorEvent.errorCode, "STT_TIMEOUT");

    controlledSTT.delayMs = 0;
    ws.close();
  });

  await t.test("F) Erro do STT Provider é isolado por chunk", async () => {
    controlledSTT.shouldFail = true;

    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-pipe-error",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-pipe-error",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-bytes").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    const errorEvent = await waitForOutput(
      (e) => e.type === "pipeline_error" && e.sessionId === "sess-pipe-error"
    );

    assert.equal(errorEvent.errorCode, "STT_TRANSCRIPTION_FAILED");

    controlledSTT.shouldFail = false;
    ws.close();
  });

  await t.test("G) Mock STT Provider padrão funciona sem erros", async () => {
    const defaultOrchestrator = new RealtimePipelineOrchestrator({
      sttProvider: new MockSTTProvider({
        mockText: "Paciente relatou melhora significativa.",
      }),
    });

    defaultOrchestrator.attachToGateway(gateway);
    const mockEvents: PipelineOutputEvent[] = [];
    defaultOrchestrator.onOutput((e) => mockEvents.push(e));

    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-mock-pipe",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        sessionId: "sess-mock-pipe",
        therapistId: "ther-pipeline-1",
        sequenceNumber: 1,
        dataBase64: Buffer.from("audio-bytes").toString("base64"),
        mimeType: "audio/webm",
        timestamp: Date.now(),
      })
    );

    await new Promise((r) => setTimeout(r, 50));

    const transcriptReady = mockEvents.find(
      (e) => e.sessionId === "sess-mock-pipe" && e.type === "transcript_ready"
    );
    assert.ok(transcriptReady);
    assert.equal(transcriptReady?.text, "Paciente relatou melhora significativa.");

    ws.close();
  });

  await t.test("H) Encerramento e Cleanup de Sessão", async () => {
    const ws = await createClient();

    ws.send(
      JSON.stringify({
        type: "session_start",
        sessionId: "sess-to-close",
        therapistId: "ther-pipeline-1",
        mimeType: "audio/webm",
      })
    );

    await new Promise((r) => setTimeout(r, 20));
    assert.ok(orchestrator.getSession("sess-to-close"));

    ws.send(
      JSON.stringify({
        type: "session_stop",
        sessionId: "sess-to-close",
        therapistId: "ther-pipeline-1",
      })
    );

    await new Promise((r) => setTimeout(r, 20));
    assert.equal(orchestrator.getSession("sess-to-close"), undefined);

    ws.close();
  });

  // Encerra Gateway
  await gateway.stop();
});
