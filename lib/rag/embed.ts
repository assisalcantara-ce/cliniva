import "server-only";

import { openaiPostJson } from "@/lib/ai/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EXPECTED_DIMS = 1536;

type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
};

export async function embedText(params: {
  input: string;
}): Promise<number[]> {
  const res = await openaiPostJson<EmbeddingsResponse>({
    path: "/embeddings",
    body: {
      model: EMBEDDING_MODEL,
      input: params.input,
    },
    timeoutMs: 45_000,
  });

  const vector = res.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("OpenAI: embeddings returned empty vector");
  }
  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `Embedding dims mismatch: expected ${EXPECTED_DIMS}, got ${vector.length}`,
    );
  }
  return vector;
}
