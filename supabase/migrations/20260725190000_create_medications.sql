-- Applied remotely via MCP as create_medications (2026-07-25)
-- Phase 2.2 — manual medications + local reminders (D-011). Owner-only RLS.
-- reminder_times HH:mm format validated in the app (CHECK cannot use subqueries).

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dose text,
  instructions text,
  reminder_times text[] not null default '{}'::text[],
  reminder_enabled boolean not null default false,
  active boolean not null default true,
  started_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medications_name_not_blank check (char_length(trim(name)) > 0)
);

comment on table public.medications is
  'Manual medication list with optional local dose reminder times (HH:mm). No pharmacy marketplace (D-011).';

create index medications_user_name_idx on public.medications (user_id, name);
create index medications_user_active_idx on public.medications (user_id, active);

grant select, insert, update, delete on table public.medications to authenticated;
grant select, insert, update, delete on table public.medications to service_role;

alter table public.medications enable row level security;

create policy "Users can select own medications"
  on public.medications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own medications"
  on public.medications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own medications"
  on public.medications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own medications"
  on public.medications for delete to authenticated
  using ((select auth.uid()) = user_id);
