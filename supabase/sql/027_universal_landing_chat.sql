-- Migration 027: Universal Multi-Tenant Chat Engine & Consumption Quotas
-- Descrição: Estrutura centralizada para o Chat Conversacional de Agendamento Cliniva.
--
-- Requisitos Atendidos:
-- 1. IDENTIFICAÇÃO DINÂMICA DE TENANT / PROFISSIONAL:
--    - public_slug (UNIQUE case-insensitive), public_booking_enabled e allowed_origins em therapists.
--    - Vinculação estrita e idempotente do cadastro homologado da Dra. Cristiane.
-- 2. SESSÕES TEMPORÁRIAS E HISTÓRICO VOLÁTIL (public.landing_chat_sessions):
--    - Array JSONB de mensagens, ip_hash (SHA-256) com salt diário, message_count (teto de 30 turnos).
--    - Expiração automática (expires_at = now() + 2 hours) para retenção mínima e LGPD.
--    - NENHUM dado clínico/anamnese é gravado nesta tabela (somente fluxo operacional de agendamento).
-- 3. PROPOSTAS DE AGENDAMENTO TEMPORÁRIAS (public.landing_chat_proposals):
--    - Slot proposto pela IA (status 'proposed', expira em 15 minutos).
--    - ON DELETE CASCADE para vinculação com landing_chat_sessions.
-- 4. CONTROLE DE CONSUMO ATÔMICO E RÍGIDO SOB CONCORRÊNCIA (public.therapist_chat_usage):
--    - Tabela de cotas por mês contábil UTC ('YYYY-MM').
--    - RPC record_therapist_chat_turn: rejeita com exceção 'CHAT_BUDGET_EXCEEDED' se a cota já estiver esgotada,
--      impedindo qualquer consumo ilimitado mesmo sob centenas de requisições simultâneas.
-- 5. CONFIRMAÇÃO TRANSACIONAL DA PROPOSTA (RPC confirm_landing_chat_proposal):
--    - Bloqueio advisory transacional por terapeuta.
--    - Validação de expiração da proposta (15 min) e status 'proposed'.
--    - Chamada atômica e segura à RPC 026 (create_landing_appointment_atomic) com a mesma idempotency_key.
--    - Impede confirmações concorrentes do mesmo slot e reutilização indevida da proposta.
-- 6. ROTINA DE LIMPEZA E RETENÇÃO MÍNIMA DE DADOS (cleanup_expired_chat_sessions):
--    - Exclui fisicamente propostas vencidas e sessões expiradas/completas há mais de 24 horas.
--    - Higieniza dados residuais de contato em propostas não convertidas.
-- 7. BLINDAGEM DE ACESSO, RLS E REVOGAÇÕES ESTRITAS:
--    - RLS ativado em todas as tabelas.
--    - Acesso revogado de PUBLIC, anon e authenticated.
--    - Permissões concedidas exclusivamente ao papel service_role do backend Cliniva.

-- ==============================================================================
-- 1. IDENTIFICAÇÃO DINÂMICA DE TENANT/PROFISSIONAL EM therapists
-- ==============================================================================

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS public_slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] DEFAULT '{}'::text[];

CREATE UNIQUE INDEX IF NOT EXISTS idx_therapists_public_slug_lower
ON public.therapists (lower(public_slug))
WHERE public_slug IS NOT NULL;

-- Vinculação autorizada e idempotente para a Dra. Cristiane (preservando outros dados)
UPDATE public.therapists
SET 
  public_slug = 'dra-cristiane',
  public_booking_enabled = true,
  allowed_origins = ARRAY[
    'https://cristianealcantara.com.br',
    'https://www.cristianealcantara.com.br',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ]
WHERE id = '8fc7331b-9153-4fe5-a230-4a2346f8617c'
  AND (public_slug IS NULL OR public_slug = 'dra-cristiane');

-- ==============================================================================
-- 2. TABELA DE SESSÕES TEMPORÁRIAS (landing_chat_sessions)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.landing_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  ip_hash CHAR(64) NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  max_messages INT NOT NULL DEFAULT 30,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'blocked')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_therapist_status
ON public.landing_chat_sessions(therapist_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at
ON public.landing_chat_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_ip_hash_active
ON public.landing_chat_sessions(ip_hash, created_at);

-- ==============================================================================
-- 3. PROPOSTAS DE AGENDAMENTO TEMPORÁRIAS (landing_chat_proposals)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.landing_chat_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.landing_chat_sessions(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  patient_name TEXT,
  patient_whatsapp TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected', 'expired')),
  idempotency_key VARCHAR(100),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_chat_proposals_session
ON public.landing_chat_proposals(session_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_proposals_expires
ON public.landing_chat_proposals(expires_at);

-- ==============================================================================
-- 4. CONTROLE DE CONSUMO E GOVERNANÇA DE IA POR TENANT (therapist_chat_usage)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.therapist_chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  billing_month CHAR(7) NOT NULL, -- formato 'YYYY-MM'
  messages_sent INT NOT NULL DEFAULT 0,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  appointments_initiated INT NOT NULL DEFAULT 0,
  appointments_completed INT NOT NULL DEFAULT 0,
  monthly_token_budget INT NOT NULL DEFAULT 500000,
  is_budget_exceeded BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_therapist_chat_usage_month UNIQUE (therapist_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_therapist_chat_usage_lookup
ON public.therapist_chat_usage(therapist_id, billing_month);

-- ==============================================================================
-- 5. RPC CONCORRENTE PARA CONSUMO DE IA (record_therapist_chat_turn)
--    Garante barreira rígida atômica sob concorrência (sem consumo ilimitado)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_therapist_chat_turn(
  p_therapist_id UUID,
  p_prompt_tokens INT DEFAULT 0,
  p_completion_tokens INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_billing_month CHAR(7) := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_current_usage RECORD;
  v_tokens_increment INT := GREATEST(0, COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0));
  v_new_total INT;
  v_budget INT;
  v_exceeded BOOLEAN;
BEGIN
  -- 1. Garante a existência do registro do mês contábil
  INSERT INTO public.therapist_chat_usage (
    therapist_id,
    billing_month,
    messages_sent,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    updated_at
  )
  VALUES (
    p_therapist_id,
    v_billing_month,
    0,
    0,
    0,
    0,
    now()
  )
  ON CONFLICT (therapist_id, billing_month) DO NOTHING;

  -- 2. Bloqueio pessimista de linha (FOR UPDATE) para verificação atômica de cota
  SELECT total_tokens, monthly_token_budget, is_budget_exceeded
  INTO v_current_usage
  FROM public.therapist_chat_usage
  WHERE therapist_id = p_therapist_id
    AND billing_month = v_billing_month
  FOR UPDATE;

  -- 3. Barreira atômica: se a cota já estiver ultrapassada, recusa imediatamente
  IF v_current_usage.is_budget_exceeded OR v_current_usage.total_tokens >= v_current_usage.monthly_token_budget THEN
    UPDATE public.therapist_chat_usage
    SET is_budget_exceeded = true, updated_at = now()
    WHERE therapist_id = p_therapist_id AND billing_month = v_billing_month;

    RAISE EXCEPTION 'CHAT_BUDGET_EXCEEDED' USING ERRCODE = '54000';
  END IF;

  -- 4. Atualização concorrente segura
  UPDATE public.therapist_chat_usage
  SET
    messages_sent = messages_sent + 1,
    prompt_tokens = prompt_tokens + GREATEST(0, COALESCE(p_prompt_tokens, 0)),
    completion_tokens = completion_tokens + GREATEST(0, COALESCE(p_completion_tokens, 0)),
    total_tokens = total_tokens + v_tokens_increment,
    is_budget_exceeded = (total_tokens + v_tokens_increment) >= monthly_token_budget,
    updated_at = now()
  WHERE therapist_id = p_therapist_id
    AND billing_month = v_billing_month
  RETURNING total_tokens, monthly_token_budget, is_budget_exceeded
  INTO v_new_total, v_budget, v_exceeded;

  RETURN jsonb_build_object(
    'billing_month', v_billing_month,
    'total_tokens', v_new_total,
    'budget', v_budget,
    'is_budget_exceeded', v_exceeded
  );
END;
$$;

-- ==============================================================================
-- 6. RPC DE CONFIRMAÇÃO TRANSACIONAL DA PROPOSTA DE CHAT
--    Vincula a sessão de chat à RPC atômica 026 sob advisory lock
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.confirm_landing_chat_proposal(
  p_proposal_id UUID,
  p_therapist_id UUID,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_full_name TEXT,
  p_whatsapp TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal RECORD;
  v_rpc_res JSONB;
  v_appointment_id UUID;
BEGIN
  -- 1. Bloqueio advisory por therapist_id (mesmo padrão da RPC 026)
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(replace(p_therapist_id::text, '-', ''), 1, 16))::bit(64)::bigint
  );

  -- 2. Localiza e bloqueia a linha da proposta (FOR UPDATE)
  SELECT *
  INTO v_proposal
  FROM public.landing_chat_proposals
  WHERE id = p_proposal_id
    AND therapist_id = p_therapist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Idempotência em propostas já confirmadas
  IF v_proposal.status = 'confirmed' THEN
    IF v_proposal.idempotency_key = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'success', true,
        'status', 'confirmed',
        'appointment_id', v_proposal.appointment_id,
        'message', 'Agendamento previamente confirmado.'
      );
    ELSE
      RAISE EXCEPTION 'PROPOSAL_ALREADY_CONFIRMED' USING ERRCODE = '23505';
    END IF;
  END IF;

  -- 4. Valida se a proposta expirou ou foi cancelada
  IF v_proposal.status != 'proposed' OR v_proposal.expires_at < now() THEN
    UPDATE public.landing_chat_proposals
    SET status = 'expired'
    WHERE id = p_proposal_id;
    
    RAISE EXCEPTION 'PROPOSAL_EXPIRED' USING ERRCODE = '22023';
  END IF;

  -- 5. Executa a RPC Atômica homologada da Migration 026
  v_rpc_res := public.create_landing_appointment_atomic(
    p_therapist_id := p_therapist_id,
    p_idempotency_key := p_idempotency_key,
    p_payload_hash := p_payload_hash,
    p_full_name := p_full_name,
    p_notes := COALESCE(p_notes, 'Agendamento solicitado via Chat Universal Cliniva'),
    p_scheduled_start := v_proposal.scheduled_start,
    p_scheduled_end := v_proposal.scheduled_end,
    p_anamnesis_payload := NULL,
    p_personal_cpf := NULL,
    p_personal_email := NULL,
    p_personal_celular := p_whatsapp,
    p_personal_birth_date := NULL
  );

  v_appointment_id := (v_rpc_res->>'appointment_id')::UUID;

  -- 6. Atualiza o status da proposta para 'confirmed' vinculando ao appointment_id
  UPDATE public.landing_chat_proposals
  SET 
    status = 'confirmed',
    appointment_id = v_appointment_id,
    idempotency_key = p_idempotency_key,
    patient_name = p_full_name,
    patient_whatsapp = p_whatsapp
  WHERE id = p_proposal_id;

  -- 7. Marca a sessão de chat como 'completed'
  UPDATE public.landing_chat_sessions
  SET status = 'completed'
  WHERE id = v_proposal.session_id;

  -- 8. Incrementa contador de agendamentos concluídos no controle de uso
  INSERT INTO public.therapist_chat_usage (
    therapist_id,
    billing_month,
    appointments_completed,
    updated_at
  )
  VALUES (
    p_therapist_id,
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM'),
    1,
    now()
  )
  ON CONFLICT (therapist_id, billing_month)
  DO UPDATE SET
    appointments_completed = public.therapist_chat_usage.appointments_completed + 1,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'status', 'confirmed',
    'appointment_id', v_appointment_id,
    'rpc_result', v_rpc_res
  );
END;
$$;

-- ==============================================================================
-- 7. BLINDAGEM DE ACESSO, RLS E REVOGAÇÕES ESTRITAS
-- ==============================================================================

ALTER TABLE public.landing_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_chat_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_chat_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.landing_chat_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.landing_chat_proposals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.therapist_chat_usage FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.landing_chat_sessions TO service_role;
GRANT ALL ON TABLE public.landing_chat_proposals TO service_role;
GRANT ALL ON TABLE public.therapist_chat_usage TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_therapist_chat_turn(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_therapist_chat_turn(UUID, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.confirm_landing_chat_proposal(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_landing_chat_proposal(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ==============================================================================
-- 8. ROTINA DE LIMPEZA E RETENÇÃO MÍNIMA DE DADOS (LGPD)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- 1. Exclui propostas vencidas há mais de 2 horas não confirmadas
  DELETE FROM public.landing_chat_proposals
  WHERE expires_at < (now() - interval '2 hours')
    AND status IN ('proposed', 'expired', 'rejected');

  -- 2. Exclui fisicamente sessões expiradas ou completas há mais de 24 horas
  -- (Garante retenção mínima de conversas de chat efêmeras)
  DELETE FROM public.landing_chat_sessions
  WHERE expires_at < (now() - interval '24 hours')
    OR status IN ('completed', 'expired', 'blocked');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 3. Marca sessões ativas que ultrapassaram expires_at como expiradas
  UPDATE public.landing_chat_sessions
  SET status = 'expired'
  WHERE expires_at < now()
    AND status = 'active';

  -- 4. Marca propostas ativas que ultrapassaram expires_at como expiradas
  UPDATE public.landing_chat_proposals
  SET status = 'expired'
  WHERE expires_at < now()
    AND status = 'proposed';

  RETURN v_deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_chat_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_sessions() TO service_role;
