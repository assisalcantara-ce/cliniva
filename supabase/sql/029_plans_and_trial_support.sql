-- Migration 029: Modelagem de Planos Comerciais e Trial de 7 Dias
-- Fase 1 do Novo Modelo Comercial Cliniva Copilot
-- 
-- Objetivos:
-- 1. Suportar catálogo de planos: 'essencial', 'premium', 'profissional', mantendo compatibilidade com o legado 'pro'/'basic'/'enterprise'.
-- 2. Adicionar controle de trial: trial_started_at, trial_ends_at, trial_used em subscriptions/therapists.
-- 3. Blindagem de RLS: revogar permissões diretas de anon/authenticated/PUBLIC sobre subscriptions e conceder exclusivamente a service_role.
-- 4. Idempotência estrita: pode ser executada com segurança em bancos existentes sem perda de dados.

DO $$
BEGIN
  -- 1. Extensão de colunas na tabela subscriptions
  ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS features_override JSONB DEFAULT '{}'::jsonb;

  -- 2. Extensão de colunas na tabela therapists para controle estrito de elegibilidade ao trial (anti-abuso por conta)
  ALTER TABLE public.therapists
    ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

  -- 3. Índices para performance em consultas de status de assinatura e expiração de trial
  CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
    ON public.subscriptions(trial_ends_at)
    WHERE is_trial = TRUE;

  CREATE INDEX IF NOT EXISTS idx_therapists_trial_used
    ON public.therapists(trial_used);

  -- 4. Blindagem de Segurança (Alinhamento com a Migration 028)
  -- Habilita RLS estrito e revoga acessos diretos via anon/authenticated para subscriptions e invoices
  ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

  REVOKE ALL ON TABLE public.subscriptions FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.invoices FROM PUBLIC, anon, authenticated;

  GRANT ALL ON TABLE public.subscriptions TO service_role;
  GRANT ALL ON TABLE public.invoices TO service_role;

  -- 5. Comentários explicativos
  COMMENT ON COLUMN public.subscriptions.is_trial IS 'Indica se a assinatura atual é um período de teste gratuito';
  COMMENT ON COLUMN public.subscriptions.trial_started_at IS 'Data/hora de início do período de trial';
  COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'Data/hora exata em que o período de trial expira';
  COMMENT ON COLUMN public.therapists.trial_used IS 'Flag permanente indicando se o profissional já usufruiu do teste de 7 dias (impede múltiplos trials)';
END $$;
