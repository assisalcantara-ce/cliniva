-- Rollback da Migration 031
DROP INDEX IF EXISTS public.idx_therapists_public_page_active;
ALTER TABLE public.therapists
  DROP COLUMN IF EXISTS headline,
  DROP COLUMN IF EXISTS specialties,
  DROP COLUMN IF EXISTS services,
  DROP COLUMN IF EXISTS modalities,
  DROP COLUMN IF EXISTS public_page_enabled;
