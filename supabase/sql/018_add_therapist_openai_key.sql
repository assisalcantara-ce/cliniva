-- Migration 018: Add OpenAI key fields to therapists

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS openai_key_added_at TIMESTAMPTZ;
