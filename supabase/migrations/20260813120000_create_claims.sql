-- Phase 5 thin / D-032: claim organizer (not insurer filing)

create type public.claim_status as enum (
  'draft',
  'submitted',
  'more_info',
  'settled'
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_id uuid not null references public.policies (id) on delete cascade,
  status public.claim_status not null default 'draft',
  hospital_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_hospital_name_trim check (
    hospital_name is null or char_length(trim(hospital_name)) > 0
  )
);

comment on table public.claims is
  'Manual claim organizer tied to an owned policy. HealthShield does not file claims or guarantee payouts (D-026 / D-032).';

create index claims_user_id_idx on public.claims (user_id);
create index claims_user_created_idx on public.claims (user_id, created_at desc);
create index claims_policy_id_idx on public.claims (policy_id);

create table public.claim_checklist_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  label text not null,
  sort_order integer not null default 0,
  done boolean not null default false,
  medical_record_id uuid references public.medical_records (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_checklist_items_key_not_blank check (char_length(trim(item_key)) > 0),
  constraint claim_checklist_items_label_not_blank check (char_length(trim(label)) > 0),
  constraint claim_checklist_items_claim_key_unique unique (claim_id, item_key)
);

comment on table public.claim_checklist_items is
  'Typical India health-claim documents for a claim organizer. Optional link to an owned vault record.';

create index claim_checklist_items_claim_id_idx on public.claim_checklist_items (claim_id);
create index claim_checklist_items_user_id_idx on public.claim_checklist_items (user_id);
create index claim_checklist_items_record_id_idx on public.claim_checklist_items (medical_record_id);

grant select, insert, update, delete on table public.claims to authenticated;
grant select, insert, update, delete on table public.claims to service_role;
grant select, insert, update, delete on table public.claim_checklist_items to authenticated;
grant select, insert, update, delete on table public.claim_checklist_items to service_role;

alter table public.claims enable row level security;
alter table public.claim_checklist_items enable row level security;

create policy "Users can select own claims"
  on public.claims for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own claims"
  on public.claims for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.policies p
      where p.id = policy_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update own claims"
  on public.claims for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.policies p
      where p.id = policy_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own claims"
  on public.claims for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select own claim checklist items"
  on public.claim_checklist_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own claim checklist items"
  on public.claim_checklist_items for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.claims c
      where c.id = claim_id and c.user_id = (select auth.uid())
    )
    and (
      medical_record_id is null
      or exists (
        select 1 from public.medical_records r
        where r.id = medical_record_id and r.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can update own claim checklist items"
  on public.claim_checklist_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.claims c
      where c.id = claim_id and c.user_id = (select auth.uid())
    )
    and (
      medical_record_id is null
      or exists (
        select 1 from public.medical_records r
        where r.id = medical_record_id and r.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can delete own claim checklist items"
  on public.claim_checklist_items for delete to authenticated
  using ((select auth.uid()) = user_id);
