import type { STTProvider } from "./types";
import { MockSTTProvider } from "./providers/mock";
import { OpenAISTTProvider } from "./providers/openai";

/**
 * Registro e Factory de Provedores STT.
 * Permite registrar e instanciar dinamicamente provedores de transcrição sem acoplamento.
 */
export class STTRegistry {
  private providers = new Map<string, () => STTProvider>();

  constructor() {
    // Registra provedor padrão mock
    this.registerProvider("mock", () => new MockSTTProvider());
    // Registra provedor real OpenAI Whisper
    this.registerProvider("openai", () => new OpenAISTTProvider());
  }

  /**
   * Registra uma factory para um identificador de provedor.
   */
  public registerProvider(providerId: string, factory: () => STTProvider): void {
    this.providers.set(providerId.toLowerCase().trim(), factory);
  }

  /**
   * Obtém a instância do provedor solicitado ou lança erro controlado.
   */
  public getProvider(providerId: string): STTProvider {
    const id = providerId.toLowerCase().trim();
    const factory = this.providers.get(id);

    if (!factory) {
      const available = Array.from(this.providers.keys()).join(", ");
      throw new Error(
        `Provedor de STT desconhecido: "${providerId}". Provedores disponíveis: [${available}].`
      );
    }

    return factory();
  }

  /**
   * Lista os identificadores de provedores registrados.
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const sttRegistry = new STTRegistry();
