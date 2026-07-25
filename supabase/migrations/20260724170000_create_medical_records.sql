-- Applied remotely via MCP as create_medical_records (2026-07-24)

create type public.record_category as enum (
  'prescription',
  'lab_report',
  'scan',
  'bill',
  'discharge_summary',
  'vaccination',
  'other'
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category public.record_category not null default 'other',
  record_date date,
  tags text[] not null default '{}',
  notes text,
  document_path text,
  document_name text,
  document_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medical_records_title_not_blank check (char_length(trim(title)) > 0)
);

comment on table public.medical_records is 'Medical documents vault (PDF/image); owner-only via RLS.';

create index medical_records_user_id_idx on public.medical_records (user_id);
create index medical_records_user_date_idx on public.medical_records (user_id, record_date desc);
create index medical_records_user_category_idx on public.medical_records (user_id, category);

grant select, insert, update, delete on table public.medical_records to authenticated;
grant select, insert, update, delete on table public.medical_records to service_role;

alter table public.medical_records enable row level security;

create policy "Users can select own medical records"
  on public.medical_records for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own medical records"
  on public.medical_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own medical records"
  on public.medical_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own medical records"
  on public.medical_records for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-records',
  'medical-records',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

create policy "Users can read own medical record docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-records'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload own medical record docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'medical-records'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update own medical record docs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'medical-records'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'medical-records'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own medical record docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'medical-records'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
