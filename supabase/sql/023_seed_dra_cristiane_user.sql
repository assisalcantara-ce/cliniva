-- Migration 023: Seed Dra. Cristiane therapist + user with bcryptjs-compatible password hash
-- Safe to run multiple times (ON CONFLICT DO NOTHING / DO UPDATE).

-- 1. Ensure therapist row exists
INSERT INTO public.therapists (display_name, is_active)
VALUES ('Dra. Cristiane', true)
ON CONFLICT DO NOTHING;

-- 2. Upsert user with bcryptjs hash for THERAPY2025
-- Uses a subselect to find the therapist_id by display_name
INSERT INTO public.users (therapist_id, email, password_hash, is_active)
SELECT
  t.id,
  'dra.cristiane@therapy.com',
  '$2b$12$IFviOIltuSurkXKOnf0JNOKNouK/OPHqaPhtg3s9WQ4SfmsJsMlFa',
  true
FROM public.therapists t
WHERE t.display_name = 'Dra. Cristiane'
LIMIT 1
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      is_active     = true;
