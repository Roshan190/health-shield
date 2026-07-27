-- Phase N / D-024: user-marked preferred hospitals (not insurer cashless).

create table public.preferred_hospitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  maps_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preferred_hospitals_name_not_blank check (char_length(trim(name)) > 0),
  constraint preferred_hospitals_place_not_blank check (char_length(trim(place_id)) > 0),
  constraint preferred_hospitals_user_place_unique unique (user_id, place_id)
);

comment on table public.preferred_hospitals is
  'Hospitals the account owner marked as preferred (e.g. believed cashless). Not insurer-verified.';

create index preferred_hospitals_user_id_idx on public.preferred_hospitals (user_id);

grant select, insert, update, delete on table public.preferred_hospitals to authenticated;
grant select, insert, update, delete on table public.preferred_hospitals to service_role;

alter table public.preferred_hospitals enable row level security;

create policy "Users can select own preferred hospitals"
  on public.preferred_hospitals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own preferred hospitals"
  on public.preferred_hospitals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own preferred hospitals"
  on public.preferred_hospitals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own preferred hospitals"
  on public.preferred_hospitals for delete to authenticated
  using ((select auth.uid()) = user_id);
