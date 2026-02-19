# Arquitetura e Tecnologias — Copiloto de Terapia

## Objetivo do produto (MVP)
Web app para apoiar o terapeuta durante/depois das sessões com **sugestões estruturadas** (temas, perguntas, hipóteses exploratórias, riscos e próximos passos) **sem diagnósticos**.

## Stack (fixa)
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS (config manual no Windows)
- Supabase
  - Postgres (tabelas: therapists, patients, sessions, transcript_chunks, session_insights, materials, material_chunks, consent_logs)
  - Storage (bucket privado `materials`)
  - pgvector (material_chunks.embedding)
- supabase-js (sem Prisma)
- OpenAI via `fetch` (sem SDK)
  - Moderação: `omni-moderation-latest`
  - Geração: `gpt-5.1-chat-latest`
  - Embeddings: `text-embedding-3-small` (1536 dims)

## Variáveis de ambiente
Arquivo local: `.env.local` (não versionar)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; usado apenas no admin client)
- `OPENAI_API_KEY` (server-only)

## Estrutura de pastas (principais)
- `app/`
  - `dashboard/` (links + seed)
  - `patients/` (lista/cria paciente; detalhe lista/cria sessões)
  - `sessions/[id]/` (editor de transcrição + IA + lista)
  - `materials/` (materiais: manual + envio)
  - `api/` (rotas REST; única área que pode usar admin client)
- `components/`
  - `InsightCards.tsx` (renderização simples dos insights)
- `lib/`
  - `supabase/`
    - `client.ts` (browser — lê apenas `NEXT_PUBLIC_*`)
    - `server.ts` (server — lê apenas `NEXT_PUBLIC_*`)
    - `admin.ts` (server-only — lê `SUPABASE_SERVICE_ROLE_KEY`)
  - `db/therapist.ts` (seed/get-or-create do terapeuta)
  - `ai/` (moderação + prompts + geração estruturada + cliente OpenAI)
  - `rag/` (chunking + embeddings + retrieve + indexação + extração)
- `supabase/sql/`
  - `002_vector_search.sql` (RPC `match_material_chunks`)

## Tailwind (config manual)
- `tailwind.config.ts` e `postcss.config.js`
- `app/globals.css` usa `@tailwind base/components/utilities`

## APIs (REST)
### Seed
- `POST /api/seed/therapist`
  - Cria (se necessário) terapeuta `display_name="Dra. Cristiane"`.

### Patients
- `GET /api/patients` (ordenado `created_at desc`)
- `POST /api/patients`
  - Body: `{ "full_name": string, "notes"?: string }`

### Sessions
- `GET /api/patients/{patientId}/sessions`
- `POST /api/patients/{patientId}/sessions`
  - Body: `{ "consented": boolean, "consent_text"?: string }`

### Transcript
- `GET /api/sessions/{sessionId}/transcript` (ordenado `created_at asc`)
- `POST /api/sessions/{sessionId}/transcript`
  - Body: `{ "text": string, "speaker"?: string, "t_start_seconds"?: number, "t_end_seconds"?: number }`

### Insights (IA)
- `GET /api/sessions/{sessionId}/insights` (ordenado `created_at asc`)
- `POST /api/sessions/{sessionId}/insights/generate`
  - Sem body. Busca chunks, modera entrada, gera JSON, modera saída, persiste em `session_insights`.

### Materials (RAG)
- `GET /api/materials`
- `POST /api/materials`
  - Body: `{ "title": string, "text": string, "source": "manual" }`
  - Cria material e indexa texto (chunk + embedding + insert em `material_chunks`).
- `POST /api/materials/upload`
  - Multipart: `title` (opcional) + `file`
  - Valida: max 15MB, tipos PDF/DOCX
  - Salva no Storage em `materials/{materialId}/{originalFilename}`
  - Extrai texto (server), indexa no pipeline existente.

## Pipeline de IA (insights)
1. Agrega `transcript_chunks` (com `chunk_id`).
2. Modera transcrição (OpenAI moderation).
3. Gera JSON estrito (respostas estruturadas) com evidências.
4. Valida JSON com Zod.
5. Verifica que `chunk_id` citados existem.
6. Modera a saída **antes de salvar**.
7. Persiste em `session_insights` por `kind`.

### Formato de evidências
- Evidência pode vir de transcrição ou de material:
  - `{ "chunk_id"?: string, "material_id"?: string, "quote": string }`
  - Deve ter **pelo menos** `chunk_id` **ou** `material_id`.

## Pipeline de RAG
1. Materiais viram `material_chunks` (chunking 800–1200 chars com overlap leve).
2. Cada chunk recebe embedding (`text-embedding-3-small`, 1536 dims).
3. Para consulta: gera embedding da query e chama RPC `match_material_chunks`.
4. Trechos topK entram no prompt em bloco “Materiais da terapeuta”.

## RPC de busca vetorial
Arquivo: `supabase/sql/002_vector_search.sql`
- Função: `match_material_chunks(query_embedding vector(1536), match_count int)`
- Ordena por similaridade (cosine distance via `<=>`).

## Storage (Supabase)
- Bucket: `materials` (Private)
- Path: `materials/{materialId}/{originalFilename}`

## Segurança / limites atuais
- Sem Auth/RLS (MVP single-user): rotas `/api/*` usam admin client.
- Nunca importar `lib/supabase/admin.ts` no client (tem `server-only`).
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_API_KEY` no browser.
- IA não deve diagnosticar; usar linguagem de hipótese.

## Execução local
- `npm install`
- `npm run dev`

## Próximos passos (alto nível)
- Definir e aplicar RLS + Auth (quando sair do MVP single-user)
- Melhorar tipagem via tipos gerados do Supabase (opcional)
- Observabilidade (logs server-side seguros, sem vazamento de conteúdo sensível)
- Envio: confirmar instalação de dependências de extração e tratar PDFs escaneados (OCR fora do escopo)
