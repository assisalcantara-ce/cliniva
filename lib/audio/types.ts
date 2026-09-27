/**
 * Estados do ciclo de vida da captura de áudio no navegador.
 */
export type AudioCaptureState =
  | "inactive"
  | "requesting_permission"
  | "recording"
  | "paused"
  | "error";

/**
 * Configurações para inicialização da captura de áudio no navegador.
 */
export interface AudioCaptureConfig {
  /**
   * Intervalo de corte de chunks em milissegundos (padrão: 4000ms = 4s).
   */
  timeSliceMs?: number;
  /**
   * Taxa de amostragem desejada em Hz (ex: 16000, 44100, 48000).
   */
  sampleRate?: number;
  /**
   * Número de canais de áudio (1 para mono, 2 para estéreo). Mono é recomendado para STT.
   */
  channelCount?: number;
  /**
   * Ativar cancelamento de eco no hardware/navegador (padrão: true).
   */
  echoCancellation?: boolean;
  /**
   * Ativar supressão de ruído no hardware/navegador (padrão: true).
   */
  noiseSuppression?: boolean;
  /**
   * Ativar controle automático de ganho (padrão: true).
   */
  autoGainControl?: boolean;
  /**
   * Lista de MIME types preferenciais em ordem de prioridade.
   */
  preferredMimeTypes?: string[];
}

/**
 * Representação estruturada de um chunk de áudio capturado no navegador.
 */
export interface AudioChunk {
  id: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  sequenceNumber: number;
  timestamp: number;
  durationEstimatedSeconds?: number;
}

/**
 * Eventos emitidos pela instância de captura de áudio.
 */
export interface AudioCaptureEvents {
  onChunk?: (chunk: AudioChunk) => void;
  onStateChange?: (state: AudioCaptureState) => void;
  onError?: (error: Error) => void;
}

/**
 * Contrato universal de captura de áudio no navegador.
 */
export interface IAudioCapture {
  readonly state: AudioCaptureState;
  readonly mimeType: string;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
}
