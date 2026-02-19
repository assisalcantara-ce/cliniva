-- Migration: Add personal fields to patient_anamnesis for better querying and data integrity
-- Date: 2026-02-17
-- Description: Adds denormalized columns for personal information to enable efficient queries on CPF, email, celular, etc.

-- Add personal identification columns to patient_anamnesis
alter table patient_anamnesis
add column if not exists cpf text,
add column if not exists email text,
add column if not exists celular text,
add column if not exists birth_date text,
add column if not exists age_calculated int,
add column if not exists marital_status text,
add column if not exists education text,
add column if not exists profession text,
add column if not exists living_with text,
add column if not exists has_children text,
add column if not exists updated_at timestamptz default now();

-- Create indexes for frequently queried fields
create index if not exists patient_anamnesis_cpf_idx on patient_anamnesis (cpf);
create index if not exists patient_anamnesis_email_idx on patient_anamnesis (email);
create index if not exists patient_anamnesis_celular_idx on patient_anamnesis (celular);
create index if not exists patient_anamnesis_birth_date_idx on patient_anamnesis (birth_date);

-- Add comment about the payload structure
comment on table patient_anamnesis is 'Patient anamnesis (clinical history). Includes personal data (denormalized) and full structured responses (in payload JSONB).
Payload structure: {
  personal: {
    age: string,
    birth_date: string (DD/MM/AAAA),
    marital_status: string,
    cpf: string,
    email: string,
    celular: string,
    profession: string,
    education: string,
    living_with: string,
    has_children: string,
    children_count: string,
    children_ages: string
  },
  groups: [
    {
      id: string,
      title: string,
      answers: [
        {
          question: string,
          answer: string
        }
      ]
    }
  ]
}';

-- Add trigger to sync payload data to denormalized columns (optional enhancement)
-- This helps keep the denormalized columns in sync with the payload
create or replace function sync_patient_personal_fields()
returns trigger as $$
begin
  if new.payload is not null then
    new.cpf := new.payload -> 'personal' ->> 'cpf';
    new.email := new.payload -> 'personal' ->> 'email';
    new.celular := new.payload -> 'personal' ->> 'celular';
    new.birth_date := new.payload -> 'personal' ->> 'birth_date';
    new.marital_status := new.payload -> 'personal' ->> 'marital_status';
    new.education := new.payload -> 'personal' ->> 'education';
    new.profession := new.payload -> 'personal' ->> 'profession';
    new.living_with := new.payload -> 'personal' ->> 'living_with';
    new.has_children := new.payload -> 'personal' ->> 'has_children';
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically sync payload on insert/update
drop trigger if exists trigger_sync_patient_personal_fields on patient_anamnesis;
create trigger trigger_sync_patient_personal_fields
before insert or update on patient_anamnesis
for each row
execute function sync_patient_personal_fields();
