import type {
  AudioCaptureConfig,
  AudioCaptureEvents,
  AudioCaptureState,
  AudioChunk,
  IAudioCapture,
} from "./types";
import { getSupportedAudioMimeType } from "./mimeHelper";

/**
 * Gerenciador browser-side de captura e segmentação de áudio em tempo real.
 * Responsável por:
 * 1. Solicitação explícita e tratamento de permissão de microfone.
 * 2. Segmentação segura em AudioChunks controlados (evitando acúmulo infinito em memória).
 * 3. Lifecycle completo (start, pause, resume, stop, destroy).
 * 4. Liberação estrita de recursos e MediaStreamTracks no cleanup.
 */
export class AudioCapture implements IAudioCapture {
  private _state: AudioCaptureState = "inactive";
  private _selectedMimeType: string = "";
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private sequenceCounter: number = 0;
  private readonly config: Required<AudioCaptureConfig>;
  private readonly events: AudioCaptureEvents;

  constructor(config?: AudioCaptureConfig, events?: AudioCaptureEvents) {
    this.config = {
      timeSliceMs: config?.timeSliceMs ?? 4000,
      sampleRate: config?.sampleRate ?? 16000,
      channelCount: config?.channelCount ?? 1, // Mono por padrão para otimização de STT
      echoCancellation: config?.echoCancellation ?? true,
      noiseSuppression: config?.noiseSuppression ?? true,
      autoGainControl: config?.autoGainControl ?? true,
      preferredMimeTypes: config?.preferredMimeTypes ?? [],
    };
    this.events = events ?? {};
    this._selectedMimeType = getSupportedAudioMimeType(
      this.config.preferredMimeTypes.length > 0
        ? this.config.preferredMimeTypes
        : undefined
    );
  }

  public get state(): AudioCaptureState {
    return this._state;
  }

  public get mimeType(): string {
    return this._selectedMimeType;
  }

  private setState(newState: AudioCaptureState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.events.onStateChange?.(newState);
    }
  }

  /**
   * Inicia a captura de áudio após autorização explícita do usuário.
   */
  public async start(): Promise<void> {
    if (this._state === "recording") {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      const err = new Error("Ambiente ou navegador não suporta captura de microfone (getUserMedia indisponível).");
      this.setState("error");
      this.events.onError?.(err);
      throw err;
    }

    this.setState("requesting_permission");

    const audioConstraints: MediaTrackConstraints = {
      channelCount: this.config.channelCount,
      sampleRate: this.config.sampleRate,
      echoCancellation: this.config.echoCancellation,
      noiseSuppression: this.config.noiseSuppression,
      autoGainControl: this.config.autoGainControl,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    } catch (err: unknown) {
      this.setState("error");
      const errorMsg =
        err instanceof Error
          ? err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Permissão de microfone negada pelo usuário."
            : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
            ? "Nenhum dispositivo de microfone encontrado."
            : `Erro ao obter microfone: ${err.message}`
          : "Erro desconhecido ao acessar microfone.";

      const structuredErr = new Error(errorMsg);
      this.events.onError?.(structuredErr);
      this.cleanupStream();
      throw structuredErr;
    }

    // Configuração do MediaRecorder
    try {
      const options: MediaRecorderOptions = {};
      if (this._selectedMimeType) {
        options.mimeType = this._selectedMimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      // Atualiza com o mimeType real adotado pelo MediaRecorder se informado
      if (this.mediaRecorder.mimeType) {
        this._selectedMimeType = this.mediaRecorder.mimeType;
      }
    } catch (err: unknown) {
      this.setState("error");
      const structuredErr = new Error(
        `Falha ao instanciar MediaRecorder: ${err instanceof Error ? err.message : String(err)}`
      );
      this.events.onError?.(structuredErr);
      this.cleanupStream();
      throw structuredErr;
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.sequenceCounter += 1;
        const chunk: AudioChunk = {
          id: `chunk-rec-${Date.now()}-${this.sequenceCounter}`,
          blob: event.data,
          mimeType: event.data.type || this._selectedMimeType || "audio/webm",
          sizeBytes: event.data.size,
          sequenceNumber: this.sequenceCounter,
          timestamp: Date.now(),
          durationEstimatedSeconds: this.config.timeSliceMs / 1000,
        };

        this.events.onChunk?.(chunk);
      }
    };

    this.mediaRecorder.onerror = (event: Event) => {
      this.setState("error");
      const errorObj = new Error(
        `Erro interno no MediaRecorder: ${(event as unknown as { error?: Error })?.error?.message ?? "desconhecido"}`
      );
      this.events.onError?.(errorObj);
    };

    // Dispara a gravação com chunks em fatias de tempo controladas
    this.mediaRecorder.start(this.config.timeSliceMs);
    this.setState("recording");
  }

  /**
   * Pausa a captura de áudio sem liberar o microfone.
   */
  public pause(): void {
    if (this._state === "recording" && this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      this.setState("paused");
    }
  }

  /**
   * Retoma a captura de áudio pausada.
   */
  public resume(): void {
    if (this._state === "paused" && this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.setState("recording");
    }
  }

  /**
   * Encerra a gravação e solicita o último chunk residual.
   */
  public stop(): void {
    if (this._state === "inactive") return;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignora caso já esteja finalizado
      }
    }

    this.cleanupStream();
    this.setState("inactive");
  }

  /**
   * Destrói a instância, liberando tracks de áudio e listeners.
   */
  public destroy(): void {
    this.stop();
    this.mediaRecorder = null;
  }

  /**
   * Desativa todas as tracks de áudio do MediaStream.
   */
  private cleanupStream(): void {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {
        // Ignora erros ao parar tracks
      }
      this.stream = null;
    }
  }
}
