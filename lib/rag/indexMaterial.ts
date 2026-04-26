import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/rag/chunk";
import { embedText } from "@/lib/rag/embed";

export async function indexMaterial(params: {
  materialId: string;
  rawText: string;
  filename?: string;
  source: "manual" | "upload";
  apiKey?: string;
}): Promise<{ chunksCreated: number }> {
  const text = params.rawText.replace(/\r\n/g, "\n").trim();
  const chunks = chunkText({ text });
  if (chunks.length === 0) {
    return { chunksCreated: 0 };
  }

  const supabase = createSupabaseAdminClient();
  const rows: Array<Record<string, unknown>> = [];
  for (const c of chunks) {
    const embedding = await embedText({ input: c.text, apiKey: params.apiKey });
    rows.push({
      material_id: params.materialId,
      chunk_index: c.index,
      chunk_text: c.text,
      embedding,
      metadata_json: {
        source: params.source,
        char_start: c.start,
        char_end: c.end,
        filename: params.filename ?? null,
      },
    });
  }

  const insertChunks = await supabase.from("material_chunks").insert(rows);
  if (insertChunks.error) {
    throw new Error(insertChunks.error.message);
  }

  return { chunksCreated: rows.length };
}
