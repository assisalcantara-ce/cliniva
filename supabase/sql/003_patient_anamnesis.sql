create table if not exists patient_anamnesis (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  therapist_id uuid not null references therapists(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists patient_anamnesis_patient_id_idx on patient_anamnesis (patient_id);
create index if not exists patient_anamnesis_therapist_id_idx on patient_anamnesis (therapist_id);
