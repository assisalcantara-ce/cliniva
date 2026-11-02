-- Migration 031: Campos da Página Pública Profissional (/p/[slug])
-- Suporta o plano Profissional (R$ 199,90) e Trial ativo de 7 dias.
-- 
-- Permite que o terapeuta configure sua página pública:
-- 1. headline: Breve apresentação ou subtítulo profissional (ex: "Psicóloga Clínica especialista em TCC").
-- 2. specialties: Array de especialidades clínicas (ex: ["Ansiedade", "Depressão", "Trauma", "Autoestima"]).
-- 3. services: Estrutura JSONB com lista de serviços oferecidos (título, descrição, duração, preço opcional).
-- 4. modalities: Array de modalidades de atendimento (ex: ["online", "presencial"]).
-- 5. public_page_enabled: Flag booleana controlando se a página pública está publicada e acessível.

ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS headline VARCHAR(255),
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modalities TEXT[] DEFAULT ARRAY['online']::text[],
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT true;

-- Índice para busca rápida de página pública ativa
CREATE INDEX IF NOT EXISTS idx_therapists_public_page_active
  ON public.therapists(public_slug)
  WHERE public_page_enabled = true AND is_active = true;

COMMENT ON COLUMN public.therapists.headline IS 'Apresentação ou título profissional exibido no topo da página pública';
COMMENT ON COLUMN public.therapists.specialties IS 'Lista de especialidades ou áreas de atuação clínica';
COMMENT ON COLUMN public.therapists.services IS 'Lista estruturada de serviços (título, descrição, duração, valor)';
COMMENT ON COLUMN public.therapists.modalities IS 'Modalidades disponíveis: online, presencial ou ambas';
COMMENT ON COLUMN public.therapists.public_page_enabled IS 'Indica se a página pública individual está visível para visitantes';
