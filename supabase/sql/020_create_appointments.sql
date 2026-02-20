-- Migration 020: Scheduling module (availability + appointments)
-- Date: 2026-02-19

create table if not exists public.therapist_availability_rules (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  day_of_week int not null, -- 0=Sunday .. 6=Saturday
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_availability_rules_therapist on public.therapist_availability_rules(therapist_id);
create index if not exists idx_availability_rules_day on public.therapist_availability_rules(day_of_week, is_active);

create table if not exists public.therapist_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_availability_blocks_therapist on public.therapist_availability_blocks(therapist_id);
create index if not exists idx_availability_blocks_starts_at on public.therapist_availability_blocks(starts_at);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  status text not null default 'requested', -- requested | confirmed | cancelled
  source text not null default 'app', -- app | landing
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  notes text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_therapist on public.appointments(therapist_id);
create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_start on public.appointments(scheduled_start);
create index if not exists idx_appointments_status on public.appointments(status);

-- Prevent duplicate start times for the same therapist
create unique index if not exists idx_appointments_unique_start on public.appointments(therapist_id, scheduled_start);
