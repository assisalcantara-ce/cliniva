import {
  type AudioTransportConfig,
  type AudioTransportEvents,
  type AudioTransportState,
  type ClientAudioTransportMessage,
  ClientAudioTransportMessageSchema,
  type IAudioTransport,
  type ServerAudioTransportMessage,
  ServerAudioTransportMessageSchema,
} from "./types";

export interface WebSocketAudioTransportConfig extends AudioTransportConfig {
  /** URL do WebSocket (ex: ws://localhost:8080/ws/audio ou rota relativa) */
  endpointUrl?: string;
  /** Token opcional de autenticação HMAC se passado via query param */
  token?: string;
  /** Habilitar reconexão automática com backoff (default: true) */
  autoReconnect?: boolean;
  /** Máximo de tentativas de reconexão (default: 5) */
  maxReconnectAttempts?: number;
}

/**
 * Implementação Real de Transporte de Áudio via WebSocket (Browser & Node.js).
 * 
 * Responsável por:
 * 1. Conexão com o RealtimeGatewayServer (`/ws/audio`).
 * 2. Autenticação via cookie `auth_token` nativo ou query param `?token=...`.
 * 3. Envio seguro e sequencial de `session_start`, `audio_chunk`, `session_pause`, `session_resume`, `session_stop`.
 * 4. Validação Zod estrita de mensagens trafegadas.
 * 5. Gerenciamento de reconexão automática resiliente com exponential backoff.
 * 6. Limpeza e encerramento limpo de conexões.
 */
export class WebSocketAudioTransport implements IAudioTransport {
  private _state: AudioTransportState = "disconnected";
  private ws: WebSocket | null = null;
  private readonly config: Required<WebSocketAudioTransportConfig>;
  private readonly events: AudioTransportEvents;

  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManuallyClosed: boolean = false;
  private messageQueue: ClientAudioTransportMessage[] = [];
  private isProcessingQueue: boolean = false;

  constructor(
    config: WebSocketAudioTransportConfig,
    events?: AudioTransportEvents
  ) {
    if (!config.sessionId || !config.therapistId) {
      throw new Error("WebSocketAudioTransport requer sessionId e therapistId obrigatórios.");
    }

    const defaultUrl =
      typeof window !== "undefined" && window.location
        ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname || "localhost"}:8080/ws/audio`
        : "ws://localhost:8080/ws/audio";

    this.config = {
      sessionId: config.sessionId,
      therapistId: config.therapistId,
      patientId: config.patientId ?? "",
      endpointUrl: config.endpointUrl ?? defaultUrl,
      token: config.token ?? "",
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      maxQueueSize: config.maxQueueSize ?? 50,
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

  /**
   * Conecta ao servidor WebSocket.
   */
  public async connect(): Promise<void> {
    if (this._state === "connected") return;

    this.isManuallyClosed = false;
    this.setState("connecting");

    let url = this.config.endpointUrl;
    if (this.config.token) {
      const urlObj = new URL(url, "http://localhost");
      urlObj.searchParams.set("token", this.config.token);
      url = urlObj.toString().replace(/^http/, "ws");
    }

    return new Promise((resolve, reject) => {
      try {
        const WebSocketImpl =
          typeof WebSocket !== "undefined"
            ? WebSocket
            : (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;

        if (!WebSocketImpl) {
          const err = new Error("Ambiente não suporta WebSocket nativo.");
          this.setState("error");
          this.events.onError?.(err);
          reject(err);
          return;
        }

        this.ws = new WebSocketImpl(url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.setState("connected");
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleIncomingMessage(event.data);
        };

        this.ws.onerror = () => {
          const err = new Error("Erro de conexão no WebSocketAudioTransport.");
          this.events.onError?.(err);
          // Se ainda não conectou no handshake inicial
          if (this._state === "connecting") {
            this.setState("error");
            reject(err);
          }
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.handleClose(event);
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.setState("error");
        this.events.onError?.(error);
        reject(error);
      }
    });
  }

  private handleIncomingMessage(rawData: unknown): void {
    try {
      const text = typeof rawData === "string" ? rawData : String(rawData);
      const parsedJson = JSON.parse(text);
      const validation = ServerAudioTransportMessageSchema.safeParse(parsedJson);

      if (validation.success) {
        const msg: ServerAudioTransportMessage = validation.data;
        if (msg.type === "session_ack") {
          if (msg.status === "paused") this.setState("paused");
          if (msg.status === "resumed") this.setState("connected");
          if (msg.status === "stopped") this.setState("disconnected");
        } else if (msg.type === "transport_error") {
          this.setState("error");
          this.events.onError?.(new Error(`[${msg.code}] ${msg.message}`));
        }
        this.events.onMessage?.(msg);
      }
    } catch {
      // Ignora payload malformado de terceiros
    }
  }

  private handleClose(event: CloseEvent): void {
    this.ws = null;

    if (this.isManuallyClosed || event.code === 1000) {
      this.setState("disconnected");
      return;
    }

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts += 1;
      this.setState("connecting");

      const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 8000);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (!this.isManuallyClosed) {
          void this.connect().catch(() => {});
        }
      }, delayMs);
    } else {
      this.setState("error");
      this.events.onError?.(
        new Error(`Conexão WebSocket fechada (código ${event.code}: ${event.reason || "desconhecido"}).`)
      );
    }
  }

  /**
   * Envia mensagem validada para o servidor.
   */
  public send(message: ClientAudioTransportMessage): void {
    // Validação de Schema antes do envio
    const parseResult = ClientAudioTransportMessageSchema.safeParse(message);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message ?? "Mensagem malformada";
      const err = new Error(`Validação de transporte falhou: ${firstError}`);
      this.events.onError?.(err);
      throw err;
    }

    const validatedMessage = parseResult.data;

    // Atualiza estado local transitório
    if (validatedMessage.type === "session_pause") {
      this.setState("paused");
    } else if (validatedMessage.type === "session_resume") {
      this.setState("connected");
    } else if (validatedMessage.type === "session_stop") {
      this.setState("disconnected");
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(validatedMessage));
    } else {
      // Enfileira se estiver reconectando
      if (this.messageQueue.length < this.config.maxQueueSize) {
        this.messageQueue.push(validatedMessage);
      } else {
        this.events.onBackpressure?.(this.messageQueue.length);
        const err = new Error("Backpressure: Fila de envio do WebSocket excedida.");
        this.events.onError?.(err);
        throw err;
      }
    }
  }

  private flushQueue(): void {
    if (this.isProcessingQueue || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) {
        this.ws.send(JSON.stringify(msg));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Encerra a conexão WebSocket e limpa recursos.
   */
  public disconnect(): void {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.messageQueue = [];

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, "Desconexão manual");
        }
      } catch {
        // Ignora erro no close
      }
      this.ws = null;
    }

    this.setState("disconnected");
  }
}
