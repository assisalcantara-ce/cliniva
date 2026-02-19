# Setup Supabase

## Storage bucket (materials)

1. No Supabase Dashboard, vá em **Storage** → **Buckets**.
2. Crie um bucket chamado `materials`.
3. Marque como **Private** (NÃO público).

Este bucket é usado para armazenar arquivos enviados em `/materials`.

## SQL (RAG)

- Execute a função RPC de busca vetorial em:
  - [supabase/sql/002_vector_search.sql](../supabase/sql/002_vector_search.sql)

Requisitos:
- `pgvector` habilitado
- `material_chunks.embedding` como `vector(1536)`
