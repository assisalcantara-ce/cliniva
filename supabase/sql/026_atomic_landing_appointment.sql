-- Migration 026: Hardened Atomic Landing Appointment RPC with Payload Hash & Overlap Exclusion
-- Descrição: Registro atômico de agendamento público no PostgreSQL com garantia matemática de não-sobreposição.
--
-- Requisitos Atendidos:
-- 1. Proteção consistente contra sobreposições parciais (startA < endB AND endA > startB) tanto para agendamentos internos quanto da landing.
--    Prepara constraint de exclusão (btree_gist) para a tabela appointments sem quebrar status cancelados.
-- 2. Tabela landing_idempotency_keys vinculando cada idempotency_key a um hash SHA-256 canônico do payload.
--    Rejeita com erro IDEMPOTENCY_PAYLOAD_MISMATCH caso a mesma chave seja reutilizada com dados diferentes.
-- 3. Separação de paciente provisório (is_active = false) vs definitivo (is_active = true), permitindo conversão
--    segura pelo terapeuta via PATCH /api/patients/:id/deactivate sem perda de histórico de sessões ou duplicação.
-- 4. Blindagem SECURITY DEFINER com search_path = public, pg_temp.
-- 5. Privilégios estritamente revogados de PUBLIC, anon e authenticated; permitidos unicamente para service_role.

-- A. Habilitar extensão btree_gist para suporte a EXCLUDE por range de timestamps combinados com UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- B. Constraint de Exclusão contra sobreposição de intervalos ativos para o mesmo terapeuta
-- Bloqueia qualquer sobreposição (inclusive inícios diferentes ou durações variáveis), exceto agendamentos 'cancelled'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exclude_appointments_overlapping_active_slots'
  ) THEN
    ALTER TABLE public.appointments
    ADD CONSTRAINT exclude_appointments_overlapping_active_slots
    EXCLUDE USING gist (
      therapist_id WITH =,
      tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
    )
    WHERE (status != 'cancelled');
  END IF;
END $$;

-- C. Tabela de controle de idempotência com hash canônico do payload
CREATE TABLE IF NOT EXISTS public.landing_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(100) NOT NULL,
  payload_hash CHAR(64) NOT NULL, -- SHA-256 em hexadecimal
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_idempotency_unique 
ON public.landing_idempotency_keys(therapist_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_landing_idempotency_created 
ON public.landing_idempotency_keys(created_at);

-- D. Função RPC Atômica
CREATE OR REPLACE FUNCTION public.create_landing_appointment_atomic(
  p_therapist_id UUID,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_full_name TEXT,
  p_notes TEXT,
  p_scheduled_start TIMESTAMPTZ,
  p_scheduled_end TIMESTAMPTZ,
  p_anamnesis_payload JSONB DEFAULT NULL,
  p_personal_cpf TEXT DEFAULT NULL,
  p_personal_email TEXT DEFAULT NULL,
  p_personal_celular TEXT DEFAULT NULL,
  p_personal_birth_date TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_patient_id UUID;
  v_patient_number INT;
  v_appointment_id UUID;
  v_conflict_count INT;
  v_block_count INT;
  v_rule_count INT;
  v_dow INT;
  v_start_time TIME;
  v_end_time TIME;
  v_existing_hash CHAR(64);
  v_cached_response JSONB;
  v_result JSONB;
BEGIN
  -- 1. Validação de presença da chave e hash de idempotência
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_payload_hash IS NULL OR length(trim(p_payload_hash)) != 64 THEN
    RAISE EXCEPTION 'PAYLOAD_HASH_INVALID' USING ERRCODE = '22023';
  END IF;

  -- 2. Bloqueio transacional advisory por therapist_id
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(replace(p_therapist_id::text, '-', ''), 1, 16))::bit(64)::bigint
  );

  -- 3. Verificação de Idempotência e detecção de Mismatch de Payload
  SELECT payload_hash, response_payload 
  INTO v_existing_hash, v_cached_response
  FROM public.landing_idempotency_keys
  WHERE therapist_id = p_therapist_id
    AND idempotency_key = trim(p_idempotency_key);

  IF v_cached_response IS NOT NULL THEN
    IF v_existing_hash != trim(p_payload_hash) THEN
      RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_set(v_cached_response, '{is_idempotent_replay}', 'true'::jsonb);
  END IF;

  -- 4. Validação estrita de horários
  IF p_scheduled_start <= clock_timestamp() THEN
    RAISE EXCEPTION 'CANNOT_BOOK_PAST_SLOT' USING ERRCODE = '22023';
  END IF;

  IF p_scheduled_end <= p_scheduled_start THEN
    RAISE EXCEPTION 'INVALID_SLOT_DURATION' USING ERRCODE = '22023';
  END IF;

  -- 5. Revalidação contra regras semanais ativas do terapeuta
  v_dow := EXTRACT(DOW FROM p_scheduled_start AT TIME ZONE 'America/Sao_Paulo');
  v_start_time := (p_scheduled_start AT TIME ZONE 'America/Sao_Paulo')::time;
  v_end_time := (p_scheduled_end AT TIME ZONE 'America/Sao_Paulo')::time;

  SELECT count(*)
  INTO v_rule_count
  FROM public.therapist_availability_rules
  WHERE therapist_id = p_therapist_id
    AND is_active = true
    AND day_of_week = v_dow
    AND start_time <= v_start_time
    AND end_time >= v_end_time;

  IF v_rule_count = 0 THEN
    RAISE EXCEPTION 'SLOT_OUTSIDE_THERAPIST_RULES' USING ERRCODE = '22023';
  END IF;

  -- 6. Revalidação contra bloqueios pontuais de agenda
  SELECT count(*)
  INTO v_block_count
  FROM public.therapist_availability_blocks
  WHERE therapist_id = p_therapist_id
    AND starts_at < p_scheduled_end
    AND ends_at > p_scheduled_start;

  IF v_block_count > 0 THEN
    RAISE EXCEPTION 'SLOT_BLOCKED_BY_THERAPIST' USING ERRCODE = '22023';
  END IF;

  -- 7. Verificação defensiva de sobreposição com agendamentos ativos
  SELECT count(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE therapist_id = p_therapist_id
    AND status != 'cancelled'
    AND scheduled_start < p_scheduled_end
    AND scheduled_end > p_scheduled_start;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_ALREADY_BOOKED' USING ERRCODE = '23505';
  END IF;

  -- 8. Geração de patient_number serializada sob o lock advisory
  SELECT COALESCE(MAX(patient_number), 0) + 1
  INTO v_patient_number
  FROM public.patients
  WHERE therapist_id = p_therapist_id;

  -- 9. Criação de pré-cadastro provisório do paciente (is_active = false)
  -- Mantém compatibilidade com appointments.patient_id sem sujar a lista de pacientes ativos
  INSERT INTO public.patients (
    therapist_id,
    full_name,
    notes,
    patient_number,
    is_active
  )
  VALUES (
    p_therapist_id,
    p_full_name,
    COALESCE(p_notes, 'Pré-agendamento via Landing Page (Pendente de confirmação)'),
    v_patient_number,
    false
  )
  RETURNING id INTO v_patient_id;

  -- 10. Gravação de anamnese e consentimento informado
  IF p_anamnesis_payload IS NOT NULL THEN
    INSERT INTO public.patient_anamnesis (
      patient_id,
      therapist_id,
      payload,
      cpf,
      email,
      celular,
      birth_date
    )
    VALUES (
      v_patient_id,
      p_therapist_id,
      p_anamnesis_payload,
      p_personal_cpf,
      p_personal_email,
      p_personal_celular,
      p_personal_birth_date
    );
  END IF;

  -- 11. Inserção do agendamento provisório ('requested', 'landing')
  -- O Postgres aciona a constraint de exclusão garantindo sobreposição zero
  INSERT INTO public.appointments (
    therapist_id,
    patient_id,
    status,
    source,
    scheduled_start,
    scheduled_end,
    notes
  )
  VALUES (
    p_therapist_id,
    v_patient_id,
    'requested',
    'landing',
    p_scheduled_start,
    p_scheduled_end,
    p_notes
  )
  RETURNING id INTO v_appointment_id;

  -- 12. Montagem da resposta higienizada
  v_result := jsonb_build_object(
    'patient_id', v_patient_id,
    'patient_number', v_patient_number,
    'full_name', p_full_name,
    'appointment_id', v_appointment_id,
    'status', 'requested',
    'scheduled_start', p_scheduled_start,
    'scheduled_end', p_scheduled_end,
    'is_idempotent_replay', false
  );

  -- 13. Gravação da resposta e hash vinculados à chave de idempotência
  INSERT INTO public.landing_idempotency_keys (
    therapist_id,
    idempotency_key,
    payload_hash,
    response_payload
  )
  VALUES (
    p_therapist_id,
    trim(p_idempotency_key),
    trim(p_payload_hash),
    v_result
  );

  RETURN v_result;
END;
$$;

-- 14. Blindagem de Permissões
REVOKE ALL ON TABLE public.landing_idempotency_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.landing_idempotency_keys TO service_role;

REVOKE ALL ON FUNCTION public.create_landing_appointment_atomic(
  UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_landing_appointment_atomic(
  UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT, TEXT, TEXT
) TO service_role;
