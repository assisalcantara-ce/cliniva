
/**
 * Papel do locutor identificado pelo STT ou pipeline de áudio.
 */
export type STTSpeaker = "paciente" | "terapeuta" | string;

/**
 * Capacidades declaradas por um provedor de STT.
 */
export interface STTProviderCapabilities {
  supportsStreaming: boolean;
  supportsInterimResults: boolean;
  supportsSpeakerDiarization: boolean;
  supportsTimestamps: boolean;
  supportsWordLevelConfidence: boolean;
  supportedAudioFormats: string[];
}

/**
 * Entrada de áudio para processamento pelo STT.
 */
export interface STTInput {
  sessionId: string;
  therapistId: string;
  patientId?: string;
  audioChunk?: Buffer | ArrayBuffer | Uint8Array;
  mimeType?: string;
  sequenceNumber?: number;
  timestamp?: number;
  language?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado estruturado e normalizado de transcrição STT.
 */
export interface STTTranscriptResult {
  id: string;
  sessionId: string;
  therapistId: string;
  patientId?: string;
  text: string;
  speaker?: STTSpeaker;
  isFinal: boolean;
  isInterim: boolean;
  confidence?: number;
  tStartSeconds?: number;
  tEndSeconds?: number;
  timestamp?: number;
  sequenceNumber?: number;
  rawResponse?: unknown;
}

/**
 * Resultado de eventos de stream contínuo de STT.
 */
export interface STTStreamResult {
  type: "transcript" | "error" | "done";
  result?: STTTranscriptResult;
  error?: string;
}

/**
 * Interface universal para Provedores de Speech-to-Text (STT).
 */
export interface STTProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: STTProviderCapabilities;

  /**
   * Transcreve um chunk ou buffer de áudio único.
   */
  transcribeChunk(input: STTInput): Promise<STTTranscriptResult>;

  /**
   * Inicializa uma sessão de streaming incremental (se suportado).
   */
  transcribeStream?(
    input: AsyncIterable<STTInput>
  ): AsyncIterable<STTStreamResult>;
}

/**
 * Opções de normalização de dados brutos de provedores STT.
 */
export interface RawSTTInputPayload {
  id?: string;
  sessionId: string;
  therapistId: string;
  patientId?: string;
  text?: string;
  transcript?: string;
  speaker?: string;
  speakerTag?: number | string;
  isFinal?: boolean;
  is_final?: boolean;
  confidence?: number;
  confidenceScore?: number;
  startTime?: number | string;
  endTime?: number | string;
  tStartSeconds?: number;
  tEndSeconds?: number;
  timestamp?: number;
  sequenceNumber?: number;
  raw?: unknown;
}
