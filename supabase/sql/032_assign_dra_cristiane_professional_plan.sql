-- Migration 032: Vincular Tenant Dra. Cristiane ao Plano Profissional
-- Objetivo:
-- Garantir que a terapeuta Dra. Cristiane (slug: dra-cristiane, email: dra.cristiane@therapy.com)
-- possua assinatura ativa no plano 'profissional', liberando Copiloto, IA Híbrida,
-- página pública individual e agendamento.
--
-- Idempotência estrita: pode ser executada múltiplas vezes com segurança sem duplicação de assinaturas.

DO $$
DECLARE
  v_therapist_id UUID;
  v_sub_id UUID;
BEGIN
  -- 1. Localiza o id do registro oficial da Dra. Cristiane
  SELECT id INTO v_therapist_id
  FROM public.therapists
  WHERE public_slug = 'dra-cristiane'
     OR email = 'dra.cristiane@therapy.com'
  ORDER BY (public_slug = 'dra-cristiane') DESC, created_at ASC
  LIMIT 1;

  -- Se não localizou por slug ou email, busca pelo display_name vinculado ao usuário
  IF v_therapist_id IS NULL THEN
    SELECT t.id INTO v_therapist_id
    FROM public.therapists t
    JOIN public.users u ON u.therapist_id = t.id
    WHERE u.email = 'dra.cristiane@therapy.com'
    LIMIT 1;
  END IF;

  -- Se ainda assim não encontrou, busca pelo display_name 'Dra. Cristiane'
  IF v_therapist_id IS NULL THEN
    SELECT id INTO v_therapist_id
    FROM public.therapists
    WHERE display_name = 'Dra. Cristiane'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_therapist_id IS NULL THEN
    RAISE NOTICE 'Terapeuta Dra. Cristiane não foi encontrada.';
    RETURN;
  END IF;

  -- 2. Assegura que o terapeuta e usuário estejam com os dados atualizados e ativos
  UPDATE public.therapists
  SET is_active = true,
      public_slug = COALESCE(public_slug, 'dra-cristiane'),
      email = COALESCE(email, 'dra.cristiane@therapy.com'),
      public_page_enabled = true,
      public_booking_enabled = true
  WHERE id = v_therapist_id;

  UPDATE public.users
  SET is_active = true
  WHERE therapist_id = v_therapist_id;

  -- 3. Verifica se já existe uma assinatura ativa para este terapeuta
  SELECT id INTO v_sub_id
  FROM public.subscriptions
  WHERE therapist_id = v_therapist_id
    AND status = 'active'
  LIMIT 1;

  IF v_sub_id IS NOT NULL THEN
    -- Atualiza a assinatura existente para o plano Profissional
    UPDATE public.subscriptions
    SET plan = 'profissional',
        amount_cents = 19990,
        billing_cycle = 'monthly',
        is_trial = false,
        trial_ends_at = null,
        status = 'active',
        updated_at = NOW()
    WHERE id = v_sub_id;

    RAISE NOTICE 'Assinatura existente % atualizada para o plano profissional da Dra. Cristiane (%).', v_sub_id, v_therapist_id;
  ELSE
    -- Cria nova assinatura ativa no plano Profissional
    INSERT INTO public.subscriptions (
      therapist_id,
      plan,
      status,
      billing_cycle,
      amount_cents,
      next_billing_date,
      is_trial,
      created_at,
      updated_at
    ) VALUES (
      v_therapist_id,
      'profissional',
      'active',
      'monthly',
      19990,
      CURRENT_DATE + INTERVAL '1 month',
      false,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Nova assinatura criada no plano profissional para a Dra. Cristiane (%).', v_therapist_id;
  END IF;

END $$;
