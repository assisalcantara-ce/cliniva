import type { STTProvider } from "../../lib/stt/types";
import { sttResultToRealtimeChunk } from "../../lib/stt/normalizer";
import { RealtimeCopilotProcessor } from "../../lib/copilot/realtime/processor";
import type { CopilotEvent, CopilotPatientProfile } from "../../lib/copilot/types";
import type { GatewayInternalEvent } from "./types";
import type { RealtimeGatewayServer } from "./server";
import type { RealtimeCopilotResult } from "../../lib/copilot/realtime/types";
import { sttRegistry } from "../../lib/stt/registry";

import { realtimeEventBroker, RealtimeEventBroker } from "../../lib/copilot/realtime/broker";

export interface PipelineOrchestratorConfig {
  sttProvider?: STTProvider;
  defaultWindowSize?: number;
  sttTimeoutMs?: number;
  customEngineRunner?: (context: import("../../lib/copilot/types").CopilotContext) => Promise<CopilotEvent[]>;
  eventBroker?: RealtimeEventBroker;
}

export interface PipelineSessionContext {
  sessionId: string;
  therapistId: string;
  patientId?: string;
  copilotProcessor: RealtimeCopilotProcessor;
  patientProfile?: CopilotPatientProfile;
}

export interface PipelineOutputEvent {
  type: "transcript_ready" | "copilot_events_ready" | "pipeline_error";
  sessionId: string;
  therapistId: string;
  chunkId?: string;
  text?: string;
  speaker?: string;
  sequenceNumber?: number;
  newEvents?: CopilotEvent[];
  copilotResult?: RealtimeCopilotResult;
  error?: string;
  errorCode?: string;
}

/**
 * Orquestrador independente do pipeline:
 * Gateway (Áudio) → STT Provider (Transcrição) → RealtimeCopilotProcessor (Decisão/Eventos).
 *
 * Características:
 * 1. Resiliência: falhas no STT são isoladas por chunk e nunca derrubam o Gateway ou a sessão.
 * 2. Isolamento estrito por `sessionId` e `therapistId`.
 * 3. Sem persistência de áudio em disco e sem vazamento de áudio/tokens em logs.
 * 4. Silêncio respeitado: não emite eventos quando o Copilot/DecisionEngine suprimir.
 */
export class RealtimePipelineOrchestrator {
  private readonly sttProvider: STTProvider;
  private readonly sttTimeoutMs: number;
  private readonly windowSize: number;
  private readonly activeSessions = new Map<string, PipelineSessionContext>();
  private readonly outputListeners: Array<(event: PipelineOutputEvent) => void> = [];

  private readonly customEngineRunner?: (context: import("../../lib/copilot/types").CopilotContext) => Promise<CopilotEvent[]>;
  private readonly eventBroker?: RealtimeEventBroker;

  constructor(config?: PipelineOrchestratorConfig) {
    this.sttProvider = config?.sttProvider ?? sttRegistry.getProvider("mock");
    this.sttTimeoutMs = config?.sttTimeoutMs ?? 15_000;
    this.windowSize = config?.defaultWindowSize ?? 4;
    this.customEngineRunner = config?.customEngineRunner;
    this.eventBroker = config?.eventBroker ?? realtimeEventBroker;
  }

  public onOutput(listener: (event: PipelineOutputEvent) => void): () => void {
    this.outputListeners.push(listener);
    return () => {
      const idx = this.outputListeners.indexOf(listener);
      if (idx !== -1) this.outputListeners.splice(idx, 1);
    };
  }

  private emitOutput(event: PipelineOutputEvent): void {
    for (const listener of this.outputListeners) {
      try {
        listener(event);
      } catch {
        // Ignora erros em listeners externos
      }
    }

    // Publica no broker de eventos se configurado
    if (this.eventBroker) {
      try {
        if (event.type === "transcript_ready" && event.chunkId && event.text) {
          this.eventBroker.publish(event.sessionId, {
            type: "transcript_final",
            sessionId: event.sessionId,
            therapistId: event.therapistId,
            chunkId: event.chunkId,
            text: event.text,
            speaker: event.speaker,
            sequenceNumber: event.sequenceNumber,
            timestamp: Date.now(),
          });
        } else if (event.type === "copilot_events_ready" && event.newEvents) {
          for (const copilotEv of event.newEvents) {
            this.eventBroker.publish(event.sessionId, {
              type: "copilot_event",
              sessionId: event.sessionId,
              therapistId: event.therapistId,
              event: copilotEv,
              timestamp: Date.now(),
            });
          }
        } else if (event.type === "pipeline_error" && event.error) {
          this.eventBroker.publish(event.sessionId, {
            type: "pipeline_error",
            sessionId: event.sessionId,
            therapistId: event.therapistId,
            error: event.error,
            errorCode: event.errorCode,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Ignora erros de publicação no broker para manter resiliência
      }
    }
  }

  /**
   * Conecta o orquestrador ao servidor Gateway para escutar eventos internos de transporte.
   */
  public attachToGateway(gateway: RealtimeGatewayServer): void {
    gateway.onEvent((event) => {
      this.handleGatewayEvent(event).catch((err) => {
        this.emitOutput({
          type: "pipeline_error",
          sessionId: event.sessionId,
          therapistId: event.therapistId,
          error: err instanceof Error ? err.message : String(err),
          errorCode: "ORCHESTRATOR_UNHANDLED_ERROR",
        });
      });
    });
  }

  /**
   * Injeta/atualiza o perfil clínico do paciente para uma sessão ativa.
   */
  public setPatientProfile(
    sessionId: string,
    profile: CopilotPatientProfile
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.patientProfile = profile;
      session.copilotProcessor.setPatientProfile(profile);
    }
  }

  public getSession(sessionId: string): PipelineSessionContext | undefined {
    return this.activeSessions.get(sessionId);
  }

  private async handleGatewayEvent(event: GatewayInternalEvent): Promise<void> {
    switch (event.type) {
      case "SessionStarted":
        this.initSession(event);
        break;
      case "AudioReceived":
        await this.processAudioChunk(event);
        break;
      case "SessionStopped":
        this.closeSession(event.sessionId);
        break;
    }
  }

  private initSession(event: GatewayInternalEvent): void {
    const { sessionId, therapistId, patientId } = event;

    // Instancia o RealtimeCopilotProcessor volátil em memória para a sessão
    const copilotProcessor = new RealtimeCopilotProcessor({
      sessionId,
      therapistId,
      patientId,
      windowSize: this.windowSize,
      customEngineRunner: this.customEngineRunner,
    });

    this.activeSessions.set(sessionId, {
      sessionId,
      therapistId,
      patientId,
      copilotProcessor,
    });
  }

  private async processAudioChunk(event: GatewayInternalEvent): Promise<void> {
    const { sessionId, therapistId, patientId, sequenceNumber, dataBase64, mimeType, timestamp } = event;

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.emitOutput({
        type: "pipeline_error",
        sessionId,
        therapistId,
        error: "Sessão não encontrada no pipeline orquestrador.",
        errorCode: "SESSION_NOT_INITIALIZED",
      });
      return;
    }

    if (!dataBase64) {
      this.emitOutput({
        type: "pipeline_error",
        sessionId,
        therapistId,
        error: "audio_chunk recebido sem dados de áudio.",
        errorCode: "EMPTY_AUDIO_PAYLOAD",
      });
      return;
    }

    // 1. Converte Base64 para Buffer seguro sem salvar em arquivo
    const audioBuffer = Buffer.from(dataBase64, "base64");

    // 2. Chamada de Transcrição ao STT com Timeout resiliente
    let sttResult;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`STT Timeout após ${this.sttTimeoutMs}ms`)),
          this.sttTimeoutMs
        )
      );

      const transcribePromise = this.sttProvider.transcribeChunk({
        sessionId,
        therapistId,
        patientId,
        audioChunk: audioBuffer,
        mimeType: mimeType ?? "audio/webm",
        sequenceNumber,
        timestamp,
      });

      sttResult = await Promise.race([transcribePromise, timeoutPromise]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.emitOutput({
        type: "pipeline_error",
        sessionId,
        therapistId,
        error: `Falha na transcrição STT: ${errorMessage}`,
        errorCode: errorMessage.includes("Timeout") ? "STT_TIMEOUT" : "STT_TRANSCRIPTION_FAILED",
      });
      return;
    }

    // 3. Emite feedback de transcrição pronta
    this.emitOutput({
      type: "transcript_ready",
      sessionId,
      therapistId,
      chunkId: sttResult.id,
      text: sttResult.text,
      speaker: sttResult.speaker,
      sequenceNumber: sttResult.sequenceNumber,
    });

    // 4. Converte STTTranscriptResult para RealtimeTranscriptChunk
    const realtimeChunk = sttResultToRealtimeChunk(sttResult);

    // 5. Alimenta o RealtimeCopilotProcessor incrementalmente
    try {
      const copilotResult = await session.copilotProcessor.processChunk({
        sessionId,
        therapistId,
        patientId,
        chunk: realtimeChunk,
      });

      // 6. Emite resultado do Copilot somente se houver eventos ou silêncio auditável
      if (copilotResult.newEvents.length > 0) {
        this.emitOutput({
          type: "copilot_events_ready",
          sessionId,
          therapistId,
          chunkId: realtimeChunk.id,
          newEvents: copilotResult.newEvents,
          copilotResult,
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.emitOutput({
        type: "pipeline_error",
        sessionId,
        therapistId,
        error: `Falha no processamento do Copilot: ${errorMessage}`,
        errorCode: "COPILOT_PROCESSING_FAILED",
      });
    }
  }

  private closeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}
