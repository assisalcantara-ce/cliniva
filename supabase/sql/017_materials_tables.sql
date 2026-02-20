-- Migration 017: Create or align materials and material_chunks tables
-- Safe to run multiple times.

create extension if not exists vector;

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text,
  source text,
  filename text,
  mime_type text,
  storage_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.materials add column if not exists title text;
alter table public.materials add column if not exists source text;
alter table public.materials add column if not exists filename text;
alter table public.materials add column if not exists mime_type text;
alter table public.materials add column if not exists storage_path text;
alter table public.materials add column if not exists created_at timestamptz;
alter table public.materials add column if not exists updated_at timestamptz;

update public.materials
set title = coalesce(title, filename, 'Material')
where title is null;

create table if not exists public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536) not null,
  metadata_json jsonb,
  created_at timestamptz default now()
);

alter table public.material_chunks add column if not exists material_id uuid;
alter table public.material_chunks add column if not exists chunk_index int;
alter table public.material_chunks add column if not exists chunk_text text;
alter table public.material_chunks add column if not exists embedding vector(1536);
alter table public.material_chunks add column if not exists metadata_json jsonb;
alter table public.material_chunks add column if not exists created_at timestamptz;

create index if not exists idx_material_chunks_material_id on public.material_chunks(material_id);
create index if not exists idx_material_chunks_embedding on public.material_chunks using ivfflat (embedding vector_cosine_ops);

-- Optional: keep updated_at aligned
create or replace function public.set_materials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_materials_updated_at on public.materials;
create trigger set_materials_updated_at
before update on public.materials
for each row execute function public.set_materials_updated_at();
