import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/rag/embed";

export type RetrievedChunk = {
  material_id: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  metadata_json: Record<string, unknown> | null;
};

export async function retrieveMaterialChunks(params: {
  queryText: string;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const topK = params.topK ?? 8;
  const embedding = await embedText({ input: params.queryText });
  const supabase = createSupabaseAdminClient();

  const result = await supabase.rpc("match_material_chunks", {
    query_embedding: embedding,
    match_count: topK,
  });

  if (result.error) {
    throw new Error(
      `Falha na busca vetorial (RPC match_material_chunks): ${result.error.message}`,
    );
  }

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
  }

  const rows = (result.data ?? []) as unknown[];
  return rows
    .filter(isRecord)
    .map((r) => ({
      material_id: String(r.material_id ?? ""),
      chunk_index: Number(r.chunk_index ?? 0),
      chunk_text: String(r.chunk_text ?? ""),
      score: Number(r.score ?? 0),
      metadata_json: isRecord(r.metadata_json)
        ? (r.metadata_json as Record<string, unknown>)
        : null,
    }))
    .filter((r) => Boolean(r.material_id) && Boolean(r.chunk_text));
}
