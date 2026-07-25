-- Applied remotely via MCP as create_profiles (2026-07-24)
-- Kept in-repo for version control / local supabase CLI later.

create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade primary key,
  full_name text,
  date_of_birth date,
  blood_group text,
  emergency_contact_name text,
  emergency_contact_phone text,
  updated_at timestamptz default now()
);

comment on table public.profiles is 'User health profile; owner-only via RLS.';

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can select own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
