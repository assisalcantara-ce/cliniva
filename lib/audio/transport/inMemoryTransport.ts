import {
  type AudioTransportConfig,
  type AudioTransportEvents,
  type AudioTransportState,
  type ClientAudioTransportMessage,
  ClientAudioTransportMessageSchema,
  type IAudioTransport,
  type SessionAckMessage,
  type TransportErrorMessage,
} from "./types";

/**
 * Implementação Mock em memória do AudioTransport.
 * Permite simular a troca de mensagens bidirecional de transporte entre browser e servidor
 * sem depender de infraestrutura de rede externa nos testes.
 */
export class InMemoryAudioTransport implements IAudioTransport {
  private _state: AudioCaptureStateCompat = "disconnected";
  private readonly config: Required<AudioTransportConfig>;
  private readonly events: AudioTransportEvents;

  private messageQueue: ClientAudioTransportMessage[] = [];
  private lastProcessedSequence: number = 0;
  private isProcessing: boolean = false;

  constructor(config: AudioTransportConfig, events?: AudioTransportEvents) {
    if (!config.sessionId || !config.therapistId) {
      throw new Error("AudioTransport requer sessionId e therapistId obrigatórios.");
    }

    this.config = {
      sessionId: config.sessionId,
      therapistId: config.therapistId,
      patientId: config.patientId ?? "",
      endpointUrl: config.endpointUrl ?? "in-memory://audio-transport",
      maxQueueSize: config.maxQueueSize ?? 10,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
    };
    this.events = events ?? {};
  }

  public get state(): AudioTransportState {
    return this._state;
  }

  public get sessionId(): string {
    return this.config.sessionId;
  }

  public get therapistId(): string {
    return this.config.therapistId;
  }

  private setState(newState: AudioTransportState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.events.onStateChange?.(newState);
    }
  }

  public async connect(): Promise<void> {
    if (this._state === "connected") return;

    this.setState("connecting");
    // Simula handshake de transporte em memória
    await new Promise((res) => setTimeout(res, 10));
    this.setState("connected");
  }

  public send(message: ClientAudioTransportMessage): void {
    if (this._state !== "connected" && this._state !== "paused") {
      const err = new Error("Transporte não está conectado. Impossível enviar mensagem.");
      this.events.onError?.(err);
      throw err;
    }

    // 1. Validação Zod estrita
    const parseResult = ClientAudioTransportMessageSchema.safeParse(message);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message ?? "Mensagem malformada";
      const err = new Error(`Validação de transporte falhou: ${firstError}`);
      this.events.onError?.(err);
      this.emitServerError("INVALID_PAYLOAD", firstError);
      throw err;
    }

    const validatedMessage = parseResult.data;

    // 2. Validação de Isolamento de Sessão e Terapeuta
    if (
      validatedMessage.sessionId !== this.config.sessionId ||
      validatedMessage.therapistId !== this.config.therapistId
    ) {
      const err = new Error("Inconsistência de segurança: sessionId ou therapistId não confere com a conexão ativa.");
      this.events.onError?.(err);
      this.emitServerError("ISOLATION_VIOLATION", err.message);
      throw err;
    }

    // 3. Controle de Sequência para audio_chunk
    if (validatedMessage.type === "audio_chunk") {
      if (validatedMessage.sequenceNumber <= this.lastProcessedSequence) {
        const err = new Error(
          `Chunk fora de ordem detectado (recebido sequenceNumber: ${validatedMessage.sequenceNumber} <= anterior: ${this.lastProcessedSequence}).`
        );
        this.events.onError?.(err);
        this.emitServerError("OUT_OF_ORDER_CHUNK", err.message);
        throw err;
      }
      this.lastProcessedSequence = validatedMessage.sequenceNumber;
    }

    // 4. Controle de Backpressure (Queue length overflow)
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      const err = new Error(
        `Backpressure: Fila de mensagens excedeu a capacidade máxima (${this.config.maxQueueSize}).`
      );
      this.events.onBackpressure?.(this.messageQueue.length);
      this.events.onError?.(err);
      this.emitServerError("BACKPRESSURE_OVERFLOW", err.message);
      throw err;
    }

    if (validatedMessage.type === "session_pause") {
      this.setState("paused");
    } else if (validatedMessage.type === "session_resume") {
      this.setState("connected");
    } else if (validatedMessage.type === "session_stop") {
      this.setState("disconnected");
    }

    this.messageQueue.push(validatedMessage);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (!msg) break;

      try {
        await this.handleClientMessage(msg);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.events.onError?.(error);
        this.emitServerError("PROCESSING_ERROR", error.message);
      }
    }

    this.isProcessing = false;
  }

  private async handleClientMessage(msg: ClientAudioTransportMessage): Promise<void> {
    switch (msg.type) {
      case "session_start": {
        this.lastProcessedSequence = 0;
        const ack: SessionAckMessage = {
          type: "session_ack",
          sessionId: msg.sessionId,
          therapistId: msg.therapistId,
          status: "started",
          timestamp: Date.now(),
        };
        this.events.onMessage?.(ack);
        break;
      }

      case "audio_chunk": {
        this.lastProcessedSequence = msg.sequenceNumber;

        const ack: SessionAckMessage = {
          type: "session_ack",
          sessionId: msg.sessionId,
          therapistId: msg.therapistId,
          status: "received_chunk",
          sequenceNumberAcked: msg.sequenceNumber,
          timestamp: Date.now(),
        };
        this.events.onMessage?.(ack);
        break;
      }

      case "session_pause": {
        const ack: SessionAckMessage = {
          type: "session_ack",
          sessionId: msg.sessionId,
          therapistId: msg.therapistId,
          status: "paused",
          timestamp: Date.now(),
        };
        this.events.onMessage?.(ack);
        break;
      }

      case "session_resume": {
        const ack: SessionAckMessage = {
          type: "session_ack",
          sessionId: msg.sessionId,
          therapistId: msg.therapistId,
          status: "resumed",
          timestamp: Date.now(),
        };
        this.events.onMessage?.(ack);
        break;
      }

      case "session_stop": {
        const ack: SessionAckMessage = {
          type: "session_ack",
          sessionId: msg.sessionId,
          therapistId: msg.therapistId,
          status: "stopped",
          timestamp: Date.now(),
        };
        this.events.onMessage?.(ack);
        break;
      }
    }
  }

  private emitServerError(code: string, message: string): void {
    const errorMsg: TransportErrorMessage = {
      type: "transport_error",
      sessionId: this.config.sessionId,
      therapistId: this.config.therapistId,
      code,
      message,
      timestamp: Date.now(),
    };
    this.events.onMessage?.(errorMsg);
  }

  public disconnect(): void {
    this.messageQueue = [];
    this.setState("disconnected");
  }
}

type AudioCaptureStateCompat = AudioTransportState;
