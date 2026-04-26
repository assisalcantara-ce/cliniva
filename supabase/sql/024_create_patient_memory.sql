-- Patient Memory: resumo clínico persistido por paciente
-- Alimentado após cada análise completa (full insights)

CREATE TABLE IF NOT EXISTS patient_memory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id  uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  summary       text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, therapist_id)
);

-- Índice de leitura rápida por paciente+terapeuta
CREATE INDEX IF NOT EXISTS patient_memory_patient_therapist_idx
  ON patient_memory (patient_id, therapist_id);

-- RLS: somente service role acessa (toda lógica via server-side admin client)
ALTER TABLE patient_memory ENABLE ROW LEVEL SECURITY;
