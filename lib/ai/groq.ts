import "server-only";

const GROQ_BASE = "https://api.groq.com/openai/v1";

export type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqChatResponse = {
  choices: Array<{ message: { content: string } }>;
};

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || undefined;
}

/**
 * Envia uma requisição de chat completion para o Groq.
 * Retorna o conteúdo textual da primeira escolha.
 * Sempre usa response_format: json_object — inclua "JSON" no prompt.
 */
export async function groqChatJson(params: {
  model: string;
  messages: GroqChatMessage[];
  temperature?: number;
  timeoutMs?: number;
  apiKey: string;
}): Promise<string> {
  const { model, messages, temperature = 0.2, timeoutMs = 60_000, apiKey } = params;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError") throw new Error("Groq: request timed out");
      throw new Error(
        `Groq: network error${err instanceof Error ? ` (${err.message})` : ""}`,
      );
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const message =
        typeof json === "object" &&
        json !== null &&
        "error" in json
          ? String((json as { error?: { message?: unknown } }).error?.message)
          : text || `Groq request failed (${res.status})`;

      if (res.status === 429) {
        throw new Error(
          "Groq: limite de requisições atingido. Tente novamente em instantes.",
        );
      }

      throw new Error(`Groq (${res.status}): ${message}`);
    }

    const typed = json as GroqChatResponse;
    return typed?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}
