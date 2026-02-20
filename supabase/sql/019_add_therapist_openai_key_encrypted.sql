-- Migration 019: Add encrypted OpenAI key fields to therapists

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS openai_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key_last4 TEXT;
