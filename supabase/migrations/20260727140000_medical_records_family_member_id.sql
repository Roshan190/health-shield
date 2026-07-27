-- Q2.2: optional household member link on medical records (owner-private; D-008)

alter table public.medical_records
  add column family_member_id uuid references public.family_members (id) on delete set null;

comment on column public.medical_records.family_member_id is
  'Optional link to an owner-managed family_members row. Not shared login access.';

create index medical_records_user_member_idx
  on public.medical_records (user_id, family_member_id);

create or replace function public.medical_records_member_owner_check()
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

drop trigger if exists medical_records_member_owner_check on public.medical_records;

create trigger medical_records_member_owner_check
  before insert or update of family_member_id, user_id
  on public.medical_records
  for each row
  execute function public.medical_records_member_owner_check();
