-- Applied remotely via MCP as create_policies (2026-07-24)

create type public.policy_type as enum (
  'health',
  'term',
  'life',
  'personal_accident',
  'critical_illness',
  'other'
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_type public.policy_type not null default 'health',
  insurer text not null,
  policy_number text not null,
  sum_insured numeric(14, 2),
  premium_amount numeric(14, 2),
  premium_frequency text,
  start_date date,
  renewal_date date,
  nominee text,
  notes text,
  document_path text,
  document_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint policies_insurer_not_blank check (char_length(trim(insurer)) > 0),
  constraint policies_number_not_blank check (char_length(trim(policy_number)) > 0)
);

comment on table public.policies is 'Manual insurance policies; owner-only via RLS.';

create index policies_user_id_idx on public.policies (user_id);
create index policies_user_renewal_idx on public.policies (user_id, renewal_date);

grant select, insert, update, delete on table public.policies to authenticated;
grant select, insert, update, delete on table public.policies to service_role;

alter table public.policies enable row level security;

create policy "Users can select own policies"
  on public.policies for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own policies"
  on public.policies for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own policies"
  on public.policies for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own policies"
  on public.policies for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'policy-docs',
  'policy-docs',
  false,
  10485760,
  array['application/pdf']
);

create policy "Users can read own policy docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload own policy docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update own policy docs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own policy docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
