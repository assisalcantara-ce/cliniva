-- Rollback 032: Reverter assinatura da Dra. Cristiane
DO $$
DECLARE
  v_therapist_id UUID;
BEGIN
  SELECT id INTO v_therapist_id
  FROM public.therapists
  WHERE public_slug = 'dra-cristiane'
  LIMIT 1;

  IF v_therapist_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE therapist_id = v_therapist_id
      AND plan = 'profissional';
  END IF;
END $$;
