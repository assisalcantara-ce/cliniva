import { WebSocketServer, WebSocket, type RawData } from "ws";
import { type IncomingMessage } from "http";
import {
  ClientAudioTransportMessageSchema,
  type ClientAudioTransportMessage,
  type ServerAudioTransportMessage,
  MAX_AUDIO_CHUNK_BYTES,
} from "../../lib/audio/transport/types";
import { ClinivaHmacAuthenticator } from "./authenticator";
import type {
  AuthenticatedUser,
  GatewayInternalEvent,
  RealtimeAuthenticator,
  RealtimeGatewayConfig,
} from "./types";

interface SessionContext {
  ws: WebSocket;
  user: AuthenticatedUser;
  sessionId?: string;
  therapistId?: string;
  patientId?: string;
  lastSequenceNumber: number;
  messageQueueLength: number;
  inactivityTimer?: NodeJS.Timeout;
}

/**
 * Servidor WebSocket autônomo (Realtime Gateway).
 * Responsável por:
 * 1. Handshake e autenticação segura (token via header ou query param).
 * 2. Validação Zod estrita de mensagens.
 * 3. Validação de isolamento (therapistId/sessionId contra o token autenticado).
 * 4. Validação de ordem e sequência temporal (sequenceNumber).
 * 5. Proteção de memória (limite de 1MB por chunk, controle de backpressure, timeout de inatividade).
 * 6. Emissão de eventos internos desacoplados sem conhecer LLM/Copilot/STT.
 */
export class RealtimeGatewayServer {
  private wss: WebSocketServer | null = null;
  private readonly config: Required<RealtimeGatewayConfig>;
  private readonly authenticator: RealtimeAuthenticator;
  private readonly sessions = new Map<WebSocket, SessionContext>();
  private readonly therapistConnections = new Map<string, Set<WebSocket>>();
  private readonly eventListeners: Array<(event: GatewayInternalEvent) => void> = [];

  constructor(config?: RealtimeGatewayConfig) {
    this.config = {
      port: config?.port ?? 8080,
      host: config?.host ?? "0.0.0.0",
      path: config?.path ?? "/ws/audio",
      authenticator: config?.authenticator ?? new ClinivaHmacAuthenticator(),
      maxConnectionsPerTherapist: config?.maxConnectionsPerTherapist ?? 3,
      inactiveTimeoutMs: config?.inactiveTimeoutMs ?? 60_000,
      maxPayloadBytes: config?.maxPayloadBytes ?? MAX_AUDIO_CHUNK_BYTES * 2,
      maxQueueSize: config?.maxQueueSize ?? 50,
      allowedOrigins: config?.allowedOrigins ?? [],
    };
    this.authenticator = this.config.authenticator;
  }

  public onEvent(listener: (event: GatewayInternalEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx !== -1) this.eventListeners.splice(idx, 1);
    };
  }

  private emitInternalEvent(event: GatewayInternalEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignora erros em listeners externos
      }
    }
  }

  /**
   * Inicia o servidor WebSocket.
   */
  public async start(): Promise<void> {
    if (this.wss) return;

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.config.port,
          host: this.config.host,
          path: this.config.path,
          maxPayload: this.config.maxPayloadBytes,
        });

        this.wss.on("listening", () => {
          resolve();
        });

        this.wss.on("error", (err) => {
          reject(err);
        });

        this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
          this.handleConnection(ws, req);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Trata nova conexão WebSocket, autenticando antes de registrar a sessão.
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    // 1. Extração do Token de Autenticação (Header Authorization ou Query param `token`)
    const token = this.extractToken(req);

    if (!token) {
      this.rejectAndClose(ws, 4401, "Não autenticado: token ausente.");
      return;
    }

    const user = await this.authenticator.authenticate(token);
    if (!user) {
      this.rejectAndClose(ws, 4403, "Acesso negado: token inválido ou expirado.");
      return;
    }

    // 2. Limite de Conexões por Terapeuta
    const activeConns = this.therapistConnections.get(user.userId) ?? new Set<WebSocket>();
    if (activeConns.size >= this.config.maxConnectionsPerTherapist) {
      this.rejectAndClose(
        ws,
        4429,
        `Limite de conexões simultâneas atingido (${this.config.maxConnectionsPerTherapist}).`
      );
      return;
    }

    activeConns.add(ws);
    this.therapistConnections.set(user.userId, activeConns);

    // 3. Inicializa Contexto da Sessão
    const context: SessionContext = {
      ws,
      user,
      lastSequenceNumber: 0,
      messageQueueLength: 0,
    };
    this.sessions.set(ws, context);
    this.resetInactivityTimer(context);

    // 4. Listeners de Mensagem e Ciclo de Vida
    ws.on("message", (data: RawData) => {
      this.handleIncomingMessage(context, data);
    });

    ws.on("close", () => {
      this.cleanupSession(context);
    });

    ws.on("error", (err: Error) => {
      this.emitInternalEvent({
        type: "TransportError",
        sessionId: context.sessionId ?? "unknown",
        therapistId: context.therapistId ?? user.userId,
        error: err.message,
        errorCode: "WS_SOCKET_ERROR",
        timestamp: Date.now(),
      });
      this.cleanupSession(context);
    });
  }

  private extractToken(req: IncomingMessage): string | null {
    // 1. Bearer Token em Header
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }

    // 2. Cookie auth_token
    const cookieHeader = req.headers["cookie"];
    if (cookieHeader) {
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 3. Query string ?token=...
    if (req.url) {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const qToken = url.searchParams.get("token");
      if (qToken) return qToken.trim();
    }

    return null;
  }

  private handleIncomingMessage(context: SessionContext, rawData: RawData): void {
    this.resetInactivityTimer(context);

    let parsedJson: unknown;
    try {
      const text = typeof rawData === "string" ? rawData : rawData.toString("utf-8");
      parsedJson = JSON.parse(text);
    } catch {
      this.sendError(context, "INVALID_JSON", "Payload inválido: formato JSON esperado.");
      return;
    }

    // 1. Validação Zod estrita
    const parseResult = ClientAudioTransportMessageSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message ?? "Payload inválido.";
      this.sendError(context, "SCHEMA_VALIDATION_ERROR", firstIssue);
      return;
    }

    const message = parseResult.data;

    // 2. Validação de Isolamento de Identidade (therapistId deve bater com user.userId autenticado)
    if (message.therapistId !== context.user.userId) {
      this.sendError(
        context,
        "ISOLATION_VIOLATION",
        "Acesso negado: therapistId fornecido não confere com o usuário autenticado."
      );
      return;
    }

    // Se a sessão já foi vinculada, o sessionId não pode mudar no meio da conexão
    if (context.sessionId && message.sessionId !== context.sessionId) {
      this.sendError(
        context,
        "SESSION_MISMATCH",
        "sessionId inconsistente com a sessão já iniciada nesta conexão."
      );
      return;
    }

    // 3. Roteamento por Tipo de Mensagem
    switch (message.type) {
      case "session_start":
        this.handleSessionStart(context, message);
        break;
      case "audio_chunk":
        this.handleAudioChunk(context, message);
        break;
      case "session_pause":
        this.handleSessionPause(context, message);
        break;
      case "session_resume":
        this.handleSessionResume(context, message);
        break;
      case "session_stop":
        this.handleSessionStop(context, message);
        break;
    }
  }

  private handleSessionStart(
    context: SessionContext,
    msg: Extract<ClientAudioTransportMessage, { type: "session_start" }>
  ): void {
    context.sessionId = msg.sessionId;
    context.therapistId = msg.therapistId;
    context.patientId = msg.patientId;
    context.lastSequenceNumber = 0;

    this.sendAck(context, "started");

    this.emitInternalEvent({
      type: "SessionStarted",
      sessionId: msg.sessionId,
      therapistId: msg.therapistId,
      patientId: msg.patientId,
      mimeType: msg.mimeType,
      timestamp: msg.timestamp ?? Date.now(),
    });
  }

  private handleAudioChunk(
    context: SessionContext,
    msg: Extract<ClientAudioTransportMessage, { type: "audio_chunk" }>
  ): void {
    if (!context.sessionId) {
      this.sendError(
        context,
        "SESSION_NOT_STARTED",
        "audio_chunk rejeitado: session_start deve ser enviado primeiro."
      );
      return;
    }

    // Validação estrita de sequência temporal
    if (msg.sequenceNumber <= context.lastSequenceNumber) {
      this.sendError(
        context,
        "OUT_OF_ORDER_SEQUENCE",
        `Chunk fora de ordem (sequenceNumber: ${msg.sequenceNumber} <= anterior: ${context.lastSequenceNumber}).`
      );
      return;
    }

    // Backpressure check
    if (context.messageQueueLength >= this.config.maxQueueSize) {
      this.sendError(
        context,
        "BACKPRESSURE_LIMIT_EXCEEDED",
        `Limite de processamento simultâneo atingido (${this.config.maxQueueSize}).`
      );
      return;
    }

    context.lastSequenceNumber = msg.sequenceNumber;

    this.sendAck(context, "received_chunk", msg.sequenceNumber);

    this.emitInternalEvent({
      type: "AudioReceived",
      sessionId: context.sessionId,
      therapistId: context.user.userId,
      patientId: context.patientId,
      sequenceNumber: msg.sequenceNumber,
      dataBase64: msg.dataBase64,
      mimeType: msg.mimeType,
      timestamp: msg.timestamp,
    });
  }

  private handleSessionPause(
    context: SessionContext,
    msg: Extract<ClientAudioTransportMessage, { type: "session_pause" }>
  ): void {
    this.sendAck(context, "paused");
    this.emitInternalEvent({
      type: "SessionPaused",
      sessionId: msg.sessionId,
      therapistId: msg.therapistId,
      timestamp: Date.now(),
    });
  }

  private handleSessionResume(
    context: SessionContext,
    msg: Extract<ClientAudioTransportMessage, { type: "session_resume" }>
  ): void {
    this.sendAck(context, "resumed");
    this.emitInternalEvent({
      type: "SessionResumed",
      sessionId: msg.sessionId,
      therapistId: msg.therapistId,
      timestamp: Date.now(),
    });
  }

  private handleSessionStop(
    context: SessionContext,
    msg: Extract<ClientAudioTransportMessage, { type: "session_stop" }>
  ): void {
    this.sendAck(context, "stopped");
    this.emitInternalEvent({
      type: "SessionStopped",
      sessionId: msg.sessionId,
      therapistId: msg.therapistId,
      timestamp: Date.now(),
    });
    this.cleanupSession(context);
    context.ws.close(1000, "Sessão encerrada normalmente.");
  }

  private sendAck(
    context: SessionContext,
    status: "started" | "paused" | "resumed" | "stopped" | "received_chunk",
    seqAck?: number
  ): void {
    const ackMessage: ServerAudioTransportMessage = {
      type: "session_ack",
      sessionId: context.sessionId ?? "pending",
      therapistId: context.user.userId,
      status,
      sequenceNumberAcked: seqAck,
      timestamp: Date.now(),
    };
    this.safeSend(context.ws, ackMessage);
  }

  private sendError(context: SessionContext, code: string, message: string): void {
    const errMessage: ServerAudioTransportMessage = {
      type: "transport_error",
      sessionId: context.sessionId,
      therapistId: context.user.userId,
      code,
      message,
      timestamp: Date.now(),
    };
    this.safeSend(context.ws, errMessage);

    this.emitInternalEvent({
      type: "TransportError",
      sessionId: context.sessionId ?? "unknown",
      therapistId: context.user.userId,
      error: message,
      errorCode: code,
      timestamp: Date.now(),
    });
  }

  private safeSend(ws: WebSocket, payload: ServerAudioTransportMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private rejectAndClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason);
  }

  private resetInactivityTimer(context: SessionContext): void {
    if (context.inactivityTimer) {
      clearTimeout(context.inactivityTimer);
    }
    context.inactivityTimer = setTimeout(() => {
      this.sendError(context, "INACTIVITY_TIMEOUT", "Conexão encerrada por inatividade.");
      context.ws.close(4408, "Inactivity timeout");
    }, this.config.inactiveTimeoutMs);
  }

  private cleanupSession(context: SessionContext): void {
    if (context.inactivityTimer) {
      clearTimeout(context.inactivityTimer);
      context.inactivityTimer = undefined;
    }
    this.sessions.delete(context.ws);

    const userConns = this.therapistConnections.get(context.user.userId);
    if (userConns) {
      userConns.delete(context.ws);
      if (userConns.size === 0) {
        this.therapistConnections.delete(context.user.userId);
      }
    }
  }

  /**
   * Encerra o servidor e todas as conexões ativas de forma limpa.
   */
  public async stop(): Promise<void> {
    if (!this.wss) return;

    for (const ctx of this.sessions.values()) {
      this.cleanupSession(ctx);
      ctx.ws.close(1001, "Servidor sendo encerrado.");
    }

    return new Promise((resolve) => {
      this.wss?.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}
