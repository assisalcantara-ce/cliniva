import type { STTInput, STTProvider, STTProviderCapabilities, STTTranscriptResult } from "../types";
import { normalizeSTTResult } from "../normalizer";

export interface MockSTTProviderOptions {
  mockText?: string;
  mockSpeaker?: "paciente" | "terapeuta" | string;
  mockConfidence?: number;
  mockIsFinal?: boolean;
}

/**
 * Provider Mock determinístico de STT para testes sem dependências de rede externas.
 */
export class MockSTTProvider implements STTProvider {
  public readonly id = "mock";
  public readonly name = "Mock STT Provider";

  public readonly capabilities: STTProviderCapabilities = {
    supportsStreaming: true,
    supportsInterimResults: true,
    supportsSpeakerDiarization: true,
    supportsTimestamps: true,
    supportsWordLevelConfidence: true,
    supportedAudioFormats: ["audio/wav", "audio/webm", "audio/mp4", "audio/ogg"],
  };

  private defaultOptions: MockSTTProviderOptions;

  constructor(options?: MockSTTProviderOptions) {
    this.defaultOptions = options ?? {};
  }

  public async transcribeChunk(input: STTInput): Promise<STTTranscriptResult> {
    if (!input.sessionId || !input.therapistId) {
      throw new Error("STTInput requer sessionId e therapistId.");
    }

    const text = this.defaultOptions.mockText ?? "Transcrevendo fala do paciente em ambiente de teste seguro.";

    return normalizeSTTResult({
      id: `mock-chunk-${input.sequenceNumber ?? 1}`,
      sessionId: input.sessionId,
      therapistId: input.therapistId,
      patientId: input.patientId,
      text,
      speaker: this.defaultOptions.mockSpeaker ?? "paciente",
      isFinal: this.defaultOptions.mockIsFinal ?? true,
      confidenceScore: this.defaultOptions.mockConfidence ?? 0.98,
      tStartSeconds: 0,
      tEndSeconds: 4.5,
      timestamp: input.timestamp ?? Date.now(),
      sequenceNumber: input.sequenceNumber ?? 1,
      raw: { provider: "mock", simulated: true },
    });
  }
}
