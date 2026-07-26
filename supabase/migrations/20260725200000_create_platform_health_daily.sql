-- Applied remotely via MCP as create_platform_health_daily (2026-07-25)
-- Phase 2.3 — daily aggregates from Health Connect (D-011). Owner-only RLS.

create type public.platform_health_source as enum (
  'health_connect',
  'apple_health'
);

create type public.platform_health_metric as enum (
  'steps',
  'heart_rate',
  'sleep'
);

create table public.platform_health_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.platform_health_source not null,
  metric public.platform_health_metric not null,
  day date not null,
  value_primary numeric not null,
  unit text not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_health_daily_value_nonneg check (value_primary >= 0),
  constraint platform_health_daily_unit_not_blank check (char_length(trim(unit)) > 0),
  constraint platform_health_daily_unique unique (user_id, source, metric, day)
);

comment on table public.platform_health_daily is
  'Daily read-only aggregates from platform health APIs (Health Connect / later Apple Health). Not diagnosis (D-011).';

create index platform_health_daily_user_day_idx
  on public.platform_health_daily (user_id, day desc);

create index platform_health_daily_user_metric_day_idx
  on public.platform_health_daily (user_id, metric, day desc);

grant select, insert, update, delete on table public.platform_health_daily to authenticated;
grant select, insert, update, delete on table public.platform_health_daily to service_role;

alter table public.platform_health_daily enable row level security;

create policy "Users can select own platform health daily"
  on public.platform_health_daily for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own platform health daily"
  on public.platform_health_daily for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own platform health daily"
  on public.platform_health_daily for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own platform health daily"
  on public.platform_health_daily for delete to authenticated
  using ((select auth.uid()) = user_id);
