/**
 * Identidade do usuário autenticado no Realtime Gateway.
 */
export interface AuthenticatedUser {
  userId: string; // = therapist_id
  email: string;
  name?: string;
}

/**
 * Interface para provedores de autenticação do Realtime Gateway.
 */
export interface RealtimeAuthenticator {
  authenticate(tokenOrCookie: string): Promise<AuthenticatedUser | null>;
}

/**
 * Eventos internos de transporte gerados pelo Gateway.
 */
export type GatewayInternalEventType =
  | "SessionStarted"
  | "AudioReceived"
  | "SessionPaused"
  | "SessionResumed"
  | "SessionStopped"
  | "TransportError";

export interface GatewayInternalEvent {
  type: GatewayInternalEventType;
  sessionId: string;
  therapistId: string;
  patientId?: string;
  sequenceNumber?: number;
  dataBase64?: string;
  mimeType?: string;
  timestamp: number;
  error?: string;
  errorCode?: string;
}

/**
 * Configuração do Realtime Gateway.
 */
export interface RealtimeGatewayConfig {
  port?: number;
  host?: string;
  path?: string;
  authenticator?: RealtimeAuthenticator;
  maxConnectionsPerTherapist?: number;
  inactiveTimeoutMs?: number;
  maxPayloadBytes?: number;
  maxQueueSize?: number;
  allowedOrigins?: string[];
}
