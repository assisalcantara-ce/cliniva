-- Migration 030: Controle Atômico de Franquias da IA Corporativa por Terapeuta
-- Suporta o modelo comercial híbrido:
-- 1. Análises básicas de notas manuais consomem IA Corporativa Cliniva com limite mensal (Essencial, Premium, Profissional) ou limite total (Trial de 7 dias).
-- 2. Transcrição de áudio e Copiloto ao vivo requerem BYOK no Premium e Profissional.
-- 3. Bloqueio pessimista e reserva prévia atômica sob concorrência para impedir ultrapassagem de franquia.
-- 4. Endurecimento de segurança: search_path imutável em SECURITY DEFINER e revogação de EXECUTE para público.

CREATE TABLE IF NOT EXISTS public.therapist_corporate_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  billing_period VARCHAR(20) NOT NULL, -- 'trial_total' para trial, ou 'YYYY-MM' para planos regulares
  generations_count INTEGER NOT NULL DEFAULT 0,
  max_allowed INTEGER NOT NULL DEFAULT 150,
  is_quota_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_therapist_ai_usage_period UNIQUE (therapist_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_therapist_corporate_ai_usage_lookup
ON public.therapist_corporate_ai_usage(therapist_id, billing_period);

-- Função atômica e pessimista com FOR UPDATE para reservar ou estornar cota de IA
CREATE OR REPLACE FUNCTION public.check_and_increment_corporate_ai_quota(
  p_therapist_id UUID,
  p_billing_period VARCHAR(20),
  p_max_allowed INTEGER,
  p_increment INTEGER DEFAULT 1 -- 1 para reservar quota, -1 para estorno em caso de falha upstream
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usage RECORD;
  v_new_count INTEGER;
  v_exceeded BOOLEAN;
BEGIN
  -- 1. Garante a existência do registro de consumo para o período
  INSERT INTO public.therapist_corporate_ai_usage (
    therapist_id,
    billing_period,
    generations_count,
    max_allowed,
    is_quota_exceeded,
    updated_at
  )
  VALUES (
    p_therapist_id,
    p_billing_period,
    0,
    p_max_allowed,
    FALSE,
    now()
  )
  ON CONFLICT (therapist_id, billing_period) DO NOTHING;

  -- 2. Bloqueio pessimista de linha (FOR UPDATE)
  SELECT generations_count, max_allowed, is_quota_exceeded
  INTO v_usage
  FROM public.therapist_corporate_ai_usage
  WHERE therapist_id = p_therapist_id
    AND billing_period = p_billing_period
  FOR UPDATE;

  -- 3. Se for tentativa de incremento (+1) e a cota já estiver ultrapassada, recusa imediatamente
  IF p_increment > 0 AND (v_usage.is_quota_exceeded OR (v_usage.max_allowed IS NOT NULL AND v_usage.generations_count >= v_usage.max_allowed)) THEN
    UPDATE public.therapist_corporate_ai_usage
    SET is_quota_exceeded = TRUE, updated_at = now()
    WHERE therapist_id = p_therapist_id AND billing_period = p_billing_period;

    RETURN jsonb_build_object(
      'allowed', FALSE,
      'current_usage', v_usage.generations_count,
      'max_allowed', v_usage.max_allowed,
      'period', p_billing_period
    );
  END IF;

  -- 4. Atualização concorrente segura (reserva ou estorno)
  v_new_count := GREATEST(0, v_usage.generations_count + p_increment);
  v_exceeded := (v_usage.max_allowed IS NOT NULL AND v_new_count >= v_usage.max_allowed);

  UPDATE public.therapist_corporate_ai_usage
  SET
    generations_count = v_new_count,
    max_allowed = p_max_allowed,
    is_quota_exceeded = v_exceeded,
    updated_at = now()
  WHERE therapist_id = p_therapist_id AND billing_period = p_billing_period;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'current_usage', v_new_count,
    'max_allowed', p_max_allowed,
    'period', p_billing_period
  );
END;
$$;

-- Blindagem de Segurança da Função:
-- 1. Revoga acesso de execução de PUBLIC, anon e authenticated
REVOKE ALL ON FUNCTION public.check_and_increment_corporate_ai_quota(UUID, VARCHAR, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- 2. Concede execução exclusivamente ao service_role (chamado apenas pelo backend autenticado)
GRANT EXECUTE ON FUNCTION public.check_and_increment_corporate_ai_quota(UUID, VARCHAR, INTEGER, INTEGER) TO service_role;

-- Blindagem de Segurança da Tabela:
ALTER TABLE public.therapist_corporate_ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.therapist_corporate_ai_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.therapist_corporate_ai_usage TO service_role;
