-- Migration 028: Harden Clinical RLS & Revoke Public Access
-- Descrição: Ativação rigorosa de Row Level Security (RLS) e revogação de acessos diretos
-- das roles anon, authenticated e PUBLIC sobre tabelas clínicas e operacionais sensíveis.
--
-- Contexto e Justificativa de Segurança (P0):
-- 1. Tabelas com prontuários, transcrições, anamneses, insights de IA e agendamentos
--    não podem ser expostas via PostgREST na anon_key ou authenticated_key sem restrições.
-- 2. As operações de API no backend Next.js operam via servidor com service_role (createSupabaseAdminClient),
--    onde a autorização é verificada em nível de aplicação antes de consultar o banco.
-- 3. As funções RPC públicas para landing page (como create_landing_appointment_atomic e confirm_landing_chat_proposal)
--    são SECURITY DEFINER e rodam com service_role, preservando a integridade dos agendamentos públicos.
-- 4. Ao revogar anon/authenticated/PUBLIC e garantir service_role, eliminamos o risco de extração massiva
--    de dados clínicos caso o endpoint PostgREST do Supabase receba consultas diretas com a anon key.

DO $$
BEGIN
  -- 1. Habilitar Row Level Security (RLS) em todas as tabelas clínicas e de suporte
  ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.transcript_chunks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.session_insights ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.patient_memory ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.material_chunks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.consent_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapist_availability_rules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapist_availability_blocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapists ENABLE ROW LEVEL SECURITY;

  -- 2. Revogar privilégios diretos de PUBLIC, anon e authenticated
  REVOKE ALL ON TABLE public.patients FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.patient_anamnesis FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.sessions FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.transcript_chunks FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.session_insights FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.patient_memory FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.appointments FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.materials FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.material_chunks FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.consent_logs FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.therapist_availability_rules FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.therapist_availability_blocks FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON TABLE public.therapists FROM PUBLIC, anon, authenticated;

  -- 3. Conceder privilégios completos explicitamente ao role de serviço (service_role)
  GRANT ALL ON TABLE public.patients TO service_role;
  GRANT ALL ON TABLE public.patient_anamnesis TO service_role;
  GRANT ALL ON TABLE public.sessions TO service_role;
  GRANT ALL ON TABLE public.transcript_chunks TO service_role;
  GRANT ALL ON TABLE public.session_insights TO service_role;
  GRANT ALL ON TABLE public.patient_memory TO service_role;
  GRANT ALL ON TABLE public.appointments TO service_role;
  GRANT ALL ON TABLE public.materials TO service_role;
  GRANT ALL ON TABLE public.material_chunks TO service_role;
  GRANT ALL ON TABLE public.consent_logs TO service_role;
  GRANT ALL ON TABLE public.therapist_availability_rules TO service_role;
  GRANT ALL ON TABLE public.therapist_availability_blocks TO service_role;
  GRANT ALL ON TABLE public.therapists TO service_role;

  -- 4. Garantir que o service_role possa acessar sequências caso existam
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
END $$;
