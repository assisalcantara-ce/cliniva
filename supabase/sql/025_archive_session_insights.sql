-- Adiciona suporte a arquivamento de análises sem perda de histórico.
-- Ao clicar em "Nova análise", os insights anteriores são marcados com
-- archived_at em vez de deletados — preservando referência histórica.

ALTER TABLE session_insights
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Índice para acelerar consulta de insights ativos (não arquivados)
CREATE INDEX IF NOT EXISTS idx_session_insights_active
  ON session_insights (session_id, archived_at)
  WHERE archived_at IS NULL;
