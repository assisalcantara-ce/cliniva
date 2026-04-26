-- Migration 022: Add therapist_id to materials for multi-tenant isolation
-- Safe to run multiple times.

alter table public.materials
  add column if not exists therapist_id uuid references public.therapists(id) on delete cascade;

-- Index for fast therapist-scoped queries
create index if not exists idx_materials_therapist_id
  on public.materials(therapist_id);
