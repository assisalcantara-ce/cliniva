-- Create storage bucket for settings uploads
-- Bucket: therapy-files (public)

insert into storage.buckets (id, name, public)
select 'therapy-files', 'therapy-files', true
where not exists (
  select 1
  from storage.buckets
  where id = 'therapy-files'
);
