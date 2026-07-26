-- Applied remotely via MCP as create_vitals (2026-07-25)
-- Phase 2.1 — manual vitals (D-011). Owner-only RLS.

create type public.vital_type as enum (
  'blood_pressure',
  'blood_sugar',
  'weight'
);

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vital_type public.vital_type not null,
  recorded_at timestamptz not null default now(),
  value_primary numeric not null,
  value_secondary numeric,
  unit text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vitals_primary_positive check (value_primary > 0),
  constraint vitals_secondary_positive check (value_secondary is null or value_secondary > 0),
  constraint vitals_unit_not_blank check (char_length(trim(unit)) > 0),
  constraint vitals_bp_requires_secondary check (
    (
      vital_type = 'blood_pressure'
      and value_secondary is not null
    )
    or (
      vital_type <> 'blood_pressure'
      and value_secondary is null
    )
  )
);

comment on table public.vitals is
  'Manual vital readings (BP, blood sugar, weight). For personal logging only — not diagnosis (D-011).';

create index vitals_user_recorded_idx on public.vitals (user_id, recorded_at desc);
create index vitals_user_type_recorded_idx on public.vitals (user_id, vital_type, recorded_at desc);

grant select, insert, update, delete on table public.vitals to authenticated;
grant select, insert, update, delete on table public.vitals to service_role;

alter table public.vitals enable row level security;

create policy "Users can select own vitals"
  on public.vitals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own vitals"
  on public.vitals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own vitals"
  on public.vitals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own vitals"
  on public.vitals for delete to authenticated
  using ((select auth.uid()) = user_id);
