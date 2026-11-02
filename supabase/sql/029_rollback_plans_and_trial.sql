-- Rollback da Migration 029: Planos Comerciais e Trial de 7 Dias

DO $$
BEGIN
  DROP INDEX IF EXISTS public.idx_subscriptions_trial_ends_at;
  DROP INDEX IF EXISTS public.idx_therapists_trial_used;

  ALTER TABLE public.subscriptions
    DROP COLUMN IF EXISTS trial_started_at,
    DROP COLUMN IF EXISTS trial_ends_at,
    DROP COLUMN IF EXISTS is_trial,
    DROP COLUMN IF EXISTS features_override;

  ALTER TABLE public.therapists
    DROP COLUMN IF EXISTS trial_used,
    DROP COLUMN IF EXISTS trial_started_at;
END $$;
