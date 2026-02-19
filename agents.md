
# Agent Operating Guide — Therapy Copilot (devs Melo)

## Goal
Build a therapy session copilot web app (Next.js + Supabase) that helps a therapist during/after sessions by producing structured suggestions, NOT diagnoses.

## Stack (fixed)
- Next.js (App Router) + TypeScript
- supabase-js (NO Prisma)
- Tailwind + shadcn/ui
- Supabase Postgres + Storage
- OpenAI API for generation + moderation
- Vercel deploy target

## Security & Ethics (non-negotiable)
- Handle sensitive data (therapy/sexuality/trauma). Treat as high-risk.
- Never provide medical diagnosis or treatment directives. Only hypotheses and suggested questions.
- Always include evidence pointers (transcript chunk IDs + short quotes).
- Always support "consent required" flows for any recording/transcription.

## Development Rules
- Before coding: restate the task, list files to touch, and assumptions.
- Work in small commits/steps. Prefer incremental PR-sized changes.
- Do NOT introduce new libraries without asking in the chat (unless strictly necessary).
- Follow TypeScript strictness. Avoid `any`.
- Validate API inputs using Zod.
- Keep all secrets server-side. Never expose service keys in client code.

## App Boundaries (MVP)
- **v1**: Text notes/transcripts only (no live audio).
- Store transcripts and insights in Supabase.
- Upload therapist materials (PDF/DOCX/PPTX) later; start with text-only if needed.

## Data Model (tables)
`therapists`, `patients`, `sessions`, `transcript_chunks`, `session_insights`, `materials`, `material_chunks`, `consent_logs`

## OpenAI Usage
- Moderation: `omni-moderation-latest`
- Generation: `gpt-5.1-chat-latest`
- Moderate before storing AI output.

## Folder Structure
- `/app`: Routes and server actions
- `/components`: UI only
- `/lib`: Clients and domain logic (db, AI, RAG)
- `/app/api`: API routes

## AI Insights Output Format
JSON with keys:
- `themes[]` {title, description, evidence[]}
- `questions[]` {question, rationale, evidence[]}
- `hypotheses[]` {hypothesis, confidence: low|medium|high, evidence[]}
- `risks[]` {type, note, urgency, evidence[]}
- `summary` {bullets[]}
- `next_steps[]` {step, rationale}

**Evidence format**: `{chunk_id?: string, material_id?: string, quote: string}`

## Done Criteria (per task)
- Compiles (`npm run dev`)
- No secrets exposed
- Basic happy-path tested manually
