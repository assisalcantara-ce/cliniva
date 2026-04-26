# Project Decisions

## Chosen Stack
- **Framework**: Next.js (App Router) + TypeScript
- **Database**: Supabase Postgres + Storage (supabase-js client, no Prisma)
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: OpenAI API (moderation + generation)
- **Deployment**: Vercel

## MVP Scope
- Text-based session notes/transcripts (paste input)
- AI-generated structured insights with evidence pointers
- Secure storage in Supabase
- Therapist-only access (no live audio recording in v1)

## Key Non-Negotiables
- **No diagnoses**—only hypotheses and suggested questions
- Evidence-backed: transcript chunk IDs + quotes always included
- Consent workflows for any recording/transcription
- High security for sensitive data (therapy, trauma, sexuality)

## Future Phases
- Real-time transcription via OpenAI Whisper
- Multi-tenant support
- Autonomous triage experience
- PDF/DOCX material uploads with RAG

## Recent Decisions (2026-02-18)
- Support tickets are first-class: user-facing support page + admin support panel with API routes.
- Admin access uses `admin_token` cookie and permission checks per module/action.
- Settings uploads use Supabase Storage bucket `therapy-files` as public.
- Client-side image compression converts uploads to WebP before sending.
- Admin login is isolated from the admin layout shell.
- UI copy standardized with proper Portuguese accents.

## Daily Log (2026-02-19)
- Confirmed therapist AI key encryption flow exists in code; requires applying migration 019 in Supabase.
- Identified missing consent audit: `consent_logs` table and write path are not implemented yet.
- Audio/STT pipeline and recording UI are still pending (v2+).
- AI provider is per-therapist for insights, but embeddings and header status still use server env key.