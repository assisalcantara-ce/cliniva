-- RPC para busca vetorial em material_chunks (cosine distance)
-- Requisitos:
-- - extensão pgvector habilitada
-- - coluna material_chunks.embedding do tipo vector(1536)
--
-- Execute este SQL no Supabase SQL Editor.

create or replace function match_material_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  material_id uuid,
  chunk_index int,
  chunk_text text,
  metadata_json jsonb,
  score float8
)
language sql
stable
as $$
  select
    mc.material_id,
    mc.chunk_index,
    mc.chunk_text,
    mc.metadata_json,
    (1 - (mc.embedding <=> query_embedding)) as score
  from material_chunks mc
  order by mc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
