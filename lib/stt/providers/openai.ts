import type { STTInput, STTProvider, STTProviderCapabilities, STTTranscriptResult } from "../types";
import { normalizeSTTResult } from "../normalizer";

export interface OpenAISTTProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

interface OpenAITranscriptionVerboseJson {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    avg_logprob?: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

/**
 * Provider Real de Speech-to-Text via OpenAI Whisper API.
 * Encapsula chamadas de áudio respeitando isolamento de sessão, tratamento de erros e normalização.
 */
export class OpenAISTTProvider implements STTProvider {
  public readonly id = "openai";
  public readonly name = "OpenAI Whisper STT Provider";

  public readonly capabilities: STTProviderCapabilities = {
    supportsStreaming: false,
    supportsInterimResults: false,
    supportsSpeakerDiarization: false,
    supportsTimestamps: true,
    supportsWordLevelConfidence: true,
    supportedAudioFormats: [
      "audio/wav",
      "audio/webm",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/m4a",
      "audio/ogg",
    ],
  };

  private readonly explicitApiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options?: OpenAISTTProviderOptions) {
    this.explicitApiKey = options?.apiKey;
    this.model = options?.model ?? "whisper-1";
    this.timeoutMs = options?.timeoutMs ?? 45_000;
  }

  private resolveApiKey(): string {
    if (this.explicitApiKey) return this.explicitApiKey;
    const envKey = process.env.OPENAI_API_KEY;
    if (!envKey || envKey.trim().length === 0) {
      throw new Error("Configuração ausente: OPENAI_API_KEY não foi definida para o provedor OpenAI STT.");
    }
    return envKey.trim();
  }

  /**
   * Transcreve um chunk de áudio utilizando a API da OpenAI (/v1/audio/transcriptions).
   */
  public async transcribeChunk(input: STTInput): Promise<STTTranscriptResult> {
    const { sessionId, therapistId, patientId, audioChunk, mimeType, sequenceNumber, timestamp, language } = input;

    // 1. Validação de Isolamento e Segurança
    if (!sessionId || !therapistId) {
      throw new Error("Identificadores de segurança obrigatórios ausentes (sessionId, therapistId).");
    }

    if (!audioChunk) {
      throw new Error("Áudio ausente para transcrição no OpenAISTTProvider.");
    }

    const apiKey = this.resolveApiKey();

    // 2. Monta FormData com o arquivo de áudio
    const contentType = mimeType ?? "audio/webm";
    const extension = contentType.includes("wav")
      ? "wav"
      : contentType.includes("mp3") || contentType.includes("mpeg")
      ? "mp3"
      : contentType.includes("mp4")
      ? "mp4"
      : contentType.includes("ogg")
      ? "ogg"
      : "webm";

    const fileName = `audio-${sessionId}-${sequenceNumber ?? 1}.${extension}`;
    const blob = new Blob([audioChunk as BlobPart], { type: contentType });

    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("model", this.model);
    formData.append("response_format", "verbose_json");
    if (language) {
      formData.append("language", language);
    }

    // 3. Execução da requisição HTTP com Timeout e tratamento seguro de erros
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      const isTimeout =
        typeof err === "object" &&
        err !== null &&
        "name" in err &&
        (err as { name?: unknown }).name === "AbortError";

      if (isTimeout) {
        throw new Error("OpenAI STT: requisição excedeu o tempo limite (timeout).");
      }

      throw new Error(
        `OpenAI STT: falha de rede ao conectar à API${err instanceof Error ? ` (${err.message})` : ""}`
      );
    } finally {
      clearTimeout(timeoutTimer);
    }

    // 4. Tratamento seguro da resposta
    const responseText = await response.text();
    let json: unknown;
    try {
      json = responseText ? JSON.parse(responseText) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const status = response.status;
      const apiMessage =
        typeof json === "object" && json && "error" in json
          ? String((json as { error?: { message?: unknown } }).error?.message)
          : responseText || `Falha na requisição (${status})`;

      // Nunca expõe API key em logs ou erros
      throw new Error(`OpenAI STT (${status}): ${apiMessage}`);
    }

    const verboseResult = json as OpenAITranscriptionVerboseJson;
    const text = verboseResult?.text?.trim() ?? "";

    if (!text) {
      throw new Error("OpenAI STT: resposta da transcrição retornou texto vazio ou inválido.");
    }

    // 5. Cálculo de timestamps e métricas de confiança se disponíveis
    let tStartSeconds: number | undefined;
    let tEndSeconds: number | undefined;
    let confidence: number | undefined;

    if (verboseResult.segments && verboseResult.segments.length > 0) {
      const firstSegment = verboseResult.segments[0];
      const lastSegment = verboseResult.segments[verboseResult.segments.length - 1];
      tStartSeconds = firstSegment?.start;
      tEndSeconds = lastSegment?.end;

      // Se houver avg_logprob, converte log-probabilidade para escala [0, 1] aproximada: exp(avg_logprob)
      if (typeof firstSegment?.avg_logprob === "number") {
        const avgLogProb = verboseResult.segments.reduce((acc, s) => acc + (s.avg_logprob ?? 0), 0) / verboseResult.segments.length;
        confidence = Math.min(Math.max(Math.exp(avgLogProb), 0), 1);
      }
    } else if (typeof verboseResult.duration === "number") {
      tStartSeconds = 0;
      tEndSeconds = verboseResult.duration;
    }

    // 6. Normaliza e retorna através do normalizador padrão do Cliniva
    return normalizeSTTResult({
      id: `stt-openai-${sessionId}-${sequenceNumber ?? Date.now()}`,
      sessionId,
      therapistId,
      patientId,
      text,
      isFinal: true,
      confidence,
      tStartSeconds,
      tEndSeconds,
      timestamp: timestamp ?? Date.now(),
      sequenceNumber,
      raw: verboseResult,
    });
  }
}
