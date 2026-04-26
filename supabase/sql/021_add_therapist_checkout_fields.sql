-- Migration 021: Add checkout fields to therapists table
-- Needed for multi-tenant signup via /checkout flow

ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS email          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS cpf            TEXT,
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT true;

-- Índice para lookup por email (login futuro)
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapists_email
  ON public.therapists (email)
  WHERE email IS NOT NULL;

-- Índice para lookup por asaas_customer_id (webhook)
CREATE INDEX IF NOT EXISTS idx_therapists_asaas_customer_id
  ON public.therapists (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN public.therapists.email IS 'Email de login do terapeuta (obrigatório no checkout)';
COMMENT ON COLUMN public.therapists.phone IS 'Telefone do terapeuta no formato E.164 ou (XX) XXXXX-XXXX';
COMMENT ON COLUMN public.therapists.cpf IS 'CPF do terapeuta (somente dígitos, 11 chars)';
COMMENT ON COLUMN public.therapists.asaas_customer_id IS 'ID do cliente no Asaas (cus_xxxx)';
COMMENT ON COLUMN public.therapists.is_active IS 'Conta ativa — false enquanto aguarda pagamento';
