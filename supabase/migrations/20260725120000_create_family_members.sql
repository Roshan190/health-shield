-- Applied remotely via MCP as create_family_members (2026-07-25)

create type public.family_relationship as enum (
  'spouse',
  'child',
  'parent',
  'sibling',
  'grandparent',
  'other'
);

create type public.family_role as enum (
  'manager',
  'viewer'
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  relationship public.family_relationship not null default 'other',
  date_of_birth date,
  blood_group text,
  role public.family_role not null default 'viewer',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_name_not_blank check (char_length(trim(full_name)) > 0)
);

comment on table public.family_members is
  'Household member profiles managed by the account owner. Cross-account invite/share is deferred; policies & records stay owner-private by default (D-008).';

create index family_members_user_id_idx on public.family_members (user_id);
create index family_members_user_name_idx on public.family_members (user_id, full_name);

grant select, insert, update, delete on table public.family_members to authenticated;
grant select, insert, update, delete on table public.family_members to service_role;

alter table public.family_members enable row level security;

create policy "Users can select own family members"
  on public.family_members for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own family members"
  on public.family_members for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own family members"
  on public.family_members for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own family members"
  on public.family_members for delete to authenticated
  using ((select auth.uid()) = user_id);
