-- Q2.3: optional covered family member on policies (owner-private; D-008)

alter table public.policies
  add column family_member_id uuid references public.family_members (id) on delete set null;

comment on column public.policies.family_member_id is
  'Optional covered household member (owner-managed profile). Not shared login access.';

create index policies_user_member_idx
  on public.policies (user_id, family_member_id);

create or replace function public.policies_member_owner_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if NEW.family_member_id is null then
    return NEW;
  end if;
  if not exists (
    select 1
    from public.family_members m
    where m.id = NEW.family_member_id
      and m.user_id = NEW.user_id
  ) then
    raise exception 'family_member_id must belong to the same account owner';
  end if;
  return NEW;
end;
$$;

drop trigger if exists policies_member_owner_check on public.policies;

create trigger policies_member_owner_check
  before insert or update of family_member_id, user_id
  on public.policies
  for each row
  execute function public.policies_member_owner_check();
