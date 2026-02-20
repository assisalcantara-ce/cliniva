import "server-only";

type OpenAIJson = Record<string, unknown>;

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds > 0) return Math.min(30_000, asSeconds * 1000);
  const asDate = Date.parse(value);
  if (Number.isFinite(asDate)) {
    const delta = asDate - Date.now();
    if (delta > 0) return Math.min(30_000, delta);
  }
  return null;
}

function getOpenAIKey(override?: string): string {
  if (override) return override;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

export async function openaiPostJson<TResponse>(params: {
  path: string;
  body: OpenAIJson;
  timeoutMs?: number;
  maxRetries?: number;
  apiKey?: string;
}): Promise<TResponse> {
  const { path, body, timeoutMs = 45_000, maxRetries = 2, apiKey: apiKeyOverride } = params;
  const apiKey = getOpenAIKey(apiKeyOverride);

  let attempt = 0;
  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetch(`${OPENAI_API_BASE_URL}${path}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        const name =
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          typeof (err as { name?: unknown }).name === "string"
            ? String((err as { name?: unknown }).name)
            : "";
        if (name === "AbortError") {
          throw new Error("OpenAI: request timed out");
        }

        if (attempt <= maxRetries + 1) {
          const backoffMs = Math.min(5_000, 300 * 2 ** (attempt - 1));
          await sleep(backoffMs);
          continue;
        }

        throw new Error(
          `OpenAI: network error${err instanceof Error ? ` (${err.message})` : ""}`,
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
        const status = res.status;
        const message =
          typeof json === "object" && json && "error" in json
            ? String((json as { error?: { message?: unknown } }).error?.message)
            : text || `OpenAI request failed (${status})`;

        const retryable = status === 429 || status >= 500;
        if (retryable && attempt <= maxRetries + 1) {
          const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
          const base = retryAfterMs ?? Math.min(8_000, 500 * 2 ** (attempt - 1));
          const jitter = Math.floor(Math.random() * 200);
          await sleep(base + jitter);
          continue;
        }

        throw new Error(`OpenAI (${status}): ${message}`);
      }

      return json as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
