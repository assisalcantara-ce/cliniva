import { type SSEEvent, SSEEventSchema, type SSEEventListener } from "./types";

/**
 * Broker de eventos em tempo real (Pub/Sub) para o Cliniva Copilot.
 *
 * Características e Garantias Arquiteturais:
 * 1. Desacoplamento Total: o Gateway/PipelineOrchestrator publica eventos sem conhecer HTTP ou Next.js.
 * 2. Isolamento Estrito: cada sessão (`sessionId`) possui seu próprio conjunto de listeners; nunca há vazamento entre sessões ou terapeutas.
 * 3. Sem Acúmulo de Memória / Sem Replay Histórico: opera como live stream em tempo real. Eventos passados não são armazenados.
 * 4. Cleanup Automático: quando todos os listeners de uma sessão se desinscrevem, a sessão é removida do mapa para evitar vazamento de memória.
 * 5. Validação Zod: todos os eventos publicados passam por validação estrita antes da entrega.
 */
export class RealtimeEventBroker {
  private readonly sessionListeners = new Map<string, Set<SSEEventListener>>();

  /**
   * Publica um evento no canal da sessão.
   * Valida o schema Zod e entrega síncrona/imediatamente a todos os subscribers ativos.
   */
  public publish(sessionId: string, rawEvent: SSEEvent): void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error("RealtimeEventBroker: sessionId é obrigatório para publicar eventos.");
    }

    // 1. Validação estrita Zod
    const parseResult = SSEEventSchema.safeParse(rawEvent);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message ?? "Evento SSE inválido";
      throw new Error(`RealtimeEventBroker: falha na validação do evento SSE (${firstError})`);
    }

    const event = parseResult.data;
    const listeners = this.sessionListeners.get(sessionId);

    if (!listeners || listeners.size === 0) {
      // Nenhum subscriber ativo no momento: o evento é descartado com segurança (live-only)
      return;
    }

    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Ignora falhas em listeners individuais para não afetar os demais
      }
    }
  }

  /**
   * Registra um listener para escutar eventos ao vivo de uma sessão específica.
   * Retorna uma função de cancelamento (unsubscribe) limpa e segura.
   */
  public subscribe(sessionId: string, listener: SSEEventListener): () => void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error("RealtimeEventBroker: sessionId é obrigatório para inscrição.");
    }

    let listeners = this.sessionListeners.get(sessionId);
    if (!listeners) {
      listeners = new Set<SSEEventListener>();
      this.sessionListeners.set(sessionId, listeners);
    }

    listeners.add(listener);

    let isSubscribed = true;
    return () => {
      if (!isSubscribed) return;
      isSubscribed = false;

      const currentListeners = this.sessionListeners.get(sessionId);
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          this.sessionListeners.delete(sessionId);
        }
      }
    };
  }

  /**
   * Retorna a quantidade de subscribers ativos em uma sessão.
   */
  public getSubscriberCount(sessionId: string): number {
    return this.sessionListeners.get(sessionId)?.size ?? 0;
  }

  /**
   * Retorna a quantidade total de sessões ativas com listeners registrados.
   */
  public getActiveSessionsCount(): number {
    return this.sessionListeners.size;
  }

  /**
   * Remove todos os listeners de todas as sessões (útil para cleanup em testes).
   */
  public clearAll(): void {
    this.sessionListeners.clear();
  }
}

// Instância global singleton do broker para o runtime da aplicação
export const realtimeEventBroker = new RealtimeEventBroker();
