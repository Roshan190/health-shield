-- D-018 thin household invite + viewer shares

create type public.household_invite_status as enum (
  'pending',
  'accepted',
  'revoked',
  'cancelled'
);

create type public.vault_membership_status as enum (
  'active',
  'revoked'
);

create type public.vault_resource_type as enum (
  'policy',
  'medical_record'
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  invitee_email text not null,
  status public.household_invite_status not null default 'pending',
  invitee_user_id uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_invites_email_not_blank check (char_length(trim(invitee_email)) > 0),
  constraint household_invites_email_lower check (invitee_email = lower(invitee_email))
);

comment on table public.household_invites is
  'D-018: owner invites another login by email. In-app accept only for this cut (no email provider required).';

create unique index household_invites_one_pending_per_email
  on public.household_invites (owner_user_id, invitee_email)
  where status = 'pending';

create index household_invites_invitee_email_idx
  on public.household_invites (invitee_email)
  where status = 'pending';

create index household_invites_owner_idx on public.household_invites (owner_user_id);

create table public.vault_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  member_user_id uuid not null references auth.users (id) on delete cascade,
  status public.vault_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_memberships_not_self check (owner_user_id <> member_user_id),
  constraint vault_memberships_unique_pair unique (owner_user_id, member_user_id)
);

comment on table public.vault_memberships is
  'D-018: accepted household link. Member is view-only on explicitly shared items.';

create index vault_memberships_member_idx
  on public.vault_memberships (member_user_id)
  where status = 'active';

create index vault_memberships_owner_idx on public.vault_memberships (owner_user_id);

create table public.vault_item_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  member_user_id uuid not null references auth.users (id) on delete cascade,
  resource_type public.vault_resource_type not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  constraint vault_item_shares_not_self check (owner_user_id <> member_user_id),
  constraint vault_item_shares_unique unique (member_user_id, resource_type, resource_id)
);

comment on table public.vault_item_shares is
  'D-018: explicit per-item share from owner vault to a member (view-only).';

create index vault_item_shares_member_idx
  on public.vault_item_shares (member_user_id, resource_type);

create index vault_item_shares_owner_idx on public.vault_item_shares (owner_user_id);

grant select, insert, update, delete on table public.household_invites to authenticated;
grant select, insert, update, delete on table public.vault_memberships to authenticated;
grant select, insert, delete on table public.vault_item_shares to authenticated;
grant select, insert, update, delete on table public.household_invites to service_role;
grant select, insert, update, delete on table public.vault_memberships to service_role;
grant select, insert, update, delete on table public.vault_item_shares to service_role;

alter table public.household_invites enable row level security;
alter table public.vault_memberships enable row level security;
alter table public.vault_item_shares enable row level security;

-- Helpers (invoker) for RLS
create or replace function public.is_active_vault_member(p_owner uuid, p_member uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.vault_memberships m
    where m.owner_user_id = p_owner
      and m.member_user_id = p_member
      and m.status = 'active'
  );
$$;

create or replace function public.can_view_shared_resource(
  p_owner uuid,
  p_resource_type public.vault_resource_type,
  p_resource_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.vault_item_shares s
    join public.vault_memberships m
      on m.owner_user_id = s.owner_user_id
     and m.member_user_id = s.member_user_id
     and m.status = 'active'
    where s.owner_user_id = p_owner
      and s.member_user_id = (select auth.uid())
      and s.resource_type = p_resource_type
      and s.resource_id = p_resource_id
  );
$$;

revoke all on function public.is_active_vault_member(uuid, uuid) from public;
revoke all on function public.can_view_shared_resource(uuid, public.vault_resource_type, uuid) from public;
grant execute on function public.is_active_vault_member(uuid, uuid) to authenticated;
grant execute on function public.can_view_shared_resource(uuid, public.vault_resource_type, uuid) to authenticated;

-- Invites RLS
create policy "Owners manage own household invites"
  on public.household_invites for all to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "Invitees can select invites for their email"
  on public.household_invites for select to authenticated
  using (
    invitee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- Memberships RLS
create policy "Owners select own vault memberships"
  on public.vault_memberships for select to authenticated
  using (
    (select auth.uid()) = owner_user_id
    or (select auth.uid()) = member_user_id
  );

create policy "Owners insert vault memberships"
  on public.vault_memberships for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

create policy "Owners update vault memberships"
  on public.vault_memberships for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "Owners delete vault memberships"
  on public.vault_memberships for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

-- Shares RLS
create policy "Owners and members select vault item shares"
  on public.vault_item_shares for select to authenticated
  using (
    (select auth.uid()) = owner_user_id
    or (select auth.uid()) = member_user_id
  );

create policy "Owners insert vault item shares"
  on public.vault_item_shares for insert to authenticated
  with check (
    (select auth.uid()) = owner_user_id
    and public.is_active_vault_member(owner_user_id, member_user_id)
    and (
      (
        resource_type = 'policy'
        and exists (
          select 1 from public.policies p
          where p.id = resource_id and p.user_id = (select auth.uid())
        )
      )
      or (
        resource_type = 'medical_record'
        and exists (
          select 1 from public.medical_records r
          where r.id = resource_id and r.user_id = (select auth.uid())
        )
      )
    )
  );

create policy "Owners delete vault item shares"
  on public.vault_item_shares for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

-- Extend policies / medical_records SELECT for shared viewers
create policy "Members can select shared policies"
  on public.policies for select to authenticated
  using (
    public.can_view_shared_resource(user_id, 'policy'::public.vault_resource_type, id)
  );

create policy "Members can select shared medical records"
  on public.medical_records for select to authenticated
  using (
    public.can_view_shared_resource(user_id, 'medical_record'::public.vault_resource_type, id)
  );

-- Storage: allow members to read shared docs
create policy "Members can read shared policy docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'policy-docs'
    and exists (
      select 1
      from public.vault_item_shares s
      join public.policies p
        on p.id = s.resource_id
       and s.resource_type = 'policy'
      join public.vault_memberships m
        on m.owner_user_id = s.owner_user_id
       and m.member_user_id = s.member_user_id
       and m.status = 'active'
      where s.member_user_id = (select auth.uid())
        and p.document_path is not null
        and p.document_path = name
    )
  );

create policy "Members can read shared medical record docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-records'
    and exists (
      select 1
      from public.vault_item_shares s
      join public.medical_records r
        on r.id = s.resource_id
       and s.resource_type = 'medical_record'
      join public.vault_memberships m
        on m.owner_user_id = s.owner_user_id
       and m.member_user_id = s.member_user_id
       and m.status = 'active'
      where s.member_user_id = (select auth.uid())
        and r.document_path is not null
        and r.document_path = name
    )
  );

-- Accept invite (atomic)
create or replace function public.accept_household_invite(p_invite_id uuid)
returns public.vault_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invite public.household_invites%rowtype;
  v_membership public.vault_memberships%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'Your account has no email';
  end if;

  select * into v_invite
  from public.household_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  if v_invite.invitee_email <> lower(v_email) then
    raise exception 'This invite is for a different email';
  end if;

  if v_invite.owner_user_id = v_uid then
    raise exception 'You cannot accept your own invite';
  end if;

  update public.household_invites
  set
    status = 'accepted',
    invitee_user_id = v_uid,
    accepted_at = now(),
    updated_at = now()
  where id = p_invite_id;

  insert into public.vault_memberships (owner_user_id, member_user_id, status)
  values (v_invite.owner_user_id, v_uid, 'active')
  on conflict (owner_user_id, member_user_id)
  do update set
    status = 'active',
    updated_at = now()
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke all on function public.accept_household_invite(uuid) from public;
revoke all on function public.accept_household_invite(uuid) from anon;
grant execute on function public.accept_household_invite(uuid) to authenticated;

-- Revoke membership + wipe shares
create or replace function public.revoke_vault_membership(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.vault_memberships%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.vault_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if v_row.owner_user_id <> v_uid then
    raise exception 'Only the owner can revoke access';
  end if;

  update public.vault_memberships
  set status = 'revoked', updated_at = now()
  where id = p_membership_id;

  delete from public.vault_item_shares
  where owner_user_id = v_row.owner_user_id
    and member_user_id = v_row.member_user_id;
end;
$$;

revoke all on function public.revoke_vault_membership(uuid) from public;
revoke all on function public.revoke_vault_membership(uuid) from anon;
grant execute on function public.revoke_vault_membership(uuid) to authenticated;
