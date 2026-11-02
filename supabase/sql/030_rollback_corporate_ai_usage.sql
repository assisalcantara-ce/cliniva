-- Rollback da Migration 030
DROP FUNCTION IF EXISTS public.check_and_increment_corporate_ai_quota(UUID, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.check_and_increment_corporate_ai_quota(UUID, VARCHAR, INTEGER);
DROP TABLE IF EXISTS public.therapist_corporate_ai_usage;
