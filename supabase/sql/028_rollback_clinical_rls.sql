-- Rollback Script for Migration 028: Emergency Recovery Only
-- ATENÇÃO CRÍTICA DE SEGURANÇA:
-- Por padrão de defesa em profundidade, este script NÃO concede permissões públicas amplas.
-- Desabilitar RLS ou conceder grants a 'anon' em tabelas clínicas representa risco P0 de vazamento.
-- Caso seja necessária uma reversão de emergência, execute este script após definir v_allow_insecure_rollback := true.

DO $$
DECLARE
  -- TRAVA DE SEGURANÇA: Alterar para TRUE apenas sob autorização expressa em incidente
  v_allow_insecure_rollback BOOLEAN := false;
BEGIN
  IF NOT v_allow_insecure_rollback THEN
    RAISE EXCEPTION 'ROLLBACK BLOQUEADO: Reverter o RLS e conceder acesso direto a anon/authenticated em tabelas clínicas expõe dados de saúde. Para forçar a recuperação emergencial, altere v_allow_insecure_rollback para true neste script.';
  END IF;

  -- 1. Restaurar concessões de acesso para anon e authenticated (apenas se autorizado explicitamente acima)
  GRANT ALL ON TABLE public.patients TO anon, authenticated;
  GRANT ALL ON TABLE public.patient_anamnesis TO anon, authenticated;
  GRANT ALL ON TABLE public.sessions TO anon, authenticated;
  GRANT ALL ON TABLE public.transcript_chunks TO anon, authenticated;
  GRANT ALL ON TABLE public.session_insights TO anon, authenticated;
  GRANT ALL ON TABLE public.patient_memory TO anon, authenticated;
  GRANT ALL ON TABLE public.appointments TO anon, authenticated;
  GRANT ALL ON TABLE public.materials TO anon, authenticated;
  GRANT ALL ON TABLE public.material_chunks TO anon, authenticated;
  GRANT ALL ON TABLE public.consent_logs TO anon, authenticated;
  GRANT ALL ON TABLE public.therapist_availability_rules TO anon, authenticated;
  GRANT ALL ON TABLE public.therapist_availability_blocks TO anon, authenticated;
  GRANT ALL ON TABLE public.therapists TO anon, authenticated;

  -- 2. Desabilitar RLS para retornar ao estado pré-028
  ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.patient_anamnesis DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.sessions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.transcript_chunks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.session_insights DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.patient_memory DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.materials DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.material_chunks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.consent_logs DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapist_availability_rules DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapist_availability_blocks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.therapists DISABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'Rollback de emergência executado. ATENÇÃO: As tabelas clínicas estão novamente desprotegidas contra anon.';
END $$;

