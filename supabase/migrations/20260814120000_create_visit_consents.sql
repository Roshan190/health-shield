-- D-035 thin doctor visit pack (do not reuse household vault shares)

create type public.visit_consent_status as enum (
  'active',
  'revoked'
);

create table public.visit_consents (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users (id) on delete cascade,
  doctor_email text not null,
  status public.visit_consent_status not null default 'active',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_consents_email_not_blank check (char_length(trim(doctor_email)) > 0),
  constraint visit_consents_email_lower check (doctor_email = lower(doctor_email)),
  constraint visit_consents_expires_after_create check (expires_at > created_at)
);

comment on table public.visit_consents is
  'D-035: patient-granted, time-boxed visit pack for a doctor email. Family share (D-018) is separate.';

create index visit_consents_patient_idx on public.visit_consents (patient_user_id, created_at desc);
create index visit_consents_doctor_live_idx
  on public.visit_consents (doctor_email, status, expires_at)
  where status = 'active';

create table public.visit_consent_items (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references public.visit_consents (id) on delete cascade,
  resource_type public.vault_resource_type not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  constraint visit_consent_items_unique unique (consent_id, resource_type, resource_id)
);

comment on table public.visit_consent_items is
  'D-035: policies / medical records included in a visit pack. View-only for the doctor.';

create index visit_consent_items_consent_idx on public.visit_consent_items (consent_id);
create index visit_consent_items_resource_idx
  on public.visit_consent_items (resource_type, resource_id);

grant select, insert, update on table public.visit_consents to authenticated;
grant select, insert, delete on table public.visit_consent_items to authenticated;
grant select, insert, update, delete on table public.visit_consents to service_role;
grant select, insert, update, delete on table public.visit_consent_items to service_role;

alter table public.visit_consents enable row level security;
alter table public.visit_consent_items enable row level security;

create or replace function public.current_jwt_email()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), ''));
$$;

create or replace function public.visit_consent_is_live(p_consent_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.visit_consents c
    where c.id = p_consent_id
      and c.status = 'active'
      and c.expires_at > now()
  );
$$;

create or replace function public.can_doctor_view_resource(
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
    from public.visit_consent_items i
    join public.visit_consents c on c.id = i.consent_id
    where c.patient_user_id = p_owner
      and c.status = 'active'
      and c.expires_at > now()
      and c.doctor_email = public.current_jwt_email()
      and i.resource_type = p_resource_type
      and i.resource_id = p_resource_id
  );
$$;

revoke all on function public.current_jwt_email() from public;
revoke all on function public.visit_consent_is_live(uuid) from public;
revoke all on function public.can_doctor_view_resource(uuid, public.vault_resource_type, uuid) from public;
grant execute on function public.current_jwt_email() to authenticated;
grant execute on function public.visit_consent_is_live(uuid) to authenticated;
grant execute on function public.can_doctor_view_resource(uuid, public.vault_resource_type, uuid) to authenticated;

create policy "Patients select own visit consents"
  on public.visit_consents for select to authenticated
  using ((select auth.uid()) = patient_user_id);

create policy "Doctors select live consents for their email"
  on public.visit_consents for select to authenticated
  using (
    doctor_email = public.current_jwt_email()
    and status = 'active'
    and expires_at > now()
  );

create policy "Patients insert own visit consents"
  on public.visit_consents for insert to authenticated
  with check ((select auth.uid()) = patient_user_id);

create policy "Patients update own visit consents"
  on public.visit_consents for update to authenticated
  using ((select auth.uid()) = patient_user_id)
  with check ((select auth.uid()) = patient_user_id);

create policy "Patients select own visit consent items"
  on public.visit_consent_items for select to authenticated
  using (
    exists (
      select 1
      from public.visit_consents c
      where c.id = consent_id
        and c.patient_user_id = (select auth.uid())
    )
  );

create policy "Doctors select items on live consents"
  on public.visit_consent_items for select to authenticated
  using (
    exists (
      select 1
      from public.visit_consents c
      where c.id = consent_id
        and c.doctor_email = public.current_jwt_email()
        and c.status = 'active'
        and c.expires_at > now()
    )
  );

create policy "Patients insert items on own consents"
  on public.visit_consent_items for insert to authenticated
  with check (
    exists (
      select 1
      from public.visit_consents c
      where c.id = consent_id
        and c.patient_user_id = (select auth.uid())
    )
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

create policy "Doctors can select consented policies"
  on public.policies for select to authenticated
  using (
    public.can_doctor_view_resource(user_id, 'policy'::public.vault_resource_type, id)
  );

create policy "Doctors can select consented medical records"
  on public.medical_records for select to authenticated
  using (
    public.can_doctor_view_resource(user_id, 'medical_record'::public.vault_resource_type, id)
  );

create policy "Doctors can select consented record documents"
  on public.medical_record_documents for select to authenticated
  using (
    public.can_doctor_view_resource(
      user_id,
      'medical_record'::public.vault_resource_type,
      record_id
    )
  );

create policy "Doctors can read consented policy docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'policy-docs'
    and exists (
      select 1
      from public.visit_consent_items i
      join public.visit_consents c on c.id = i.consent_id
      join public.policies p
        on p.id = i.resource_id
       and i.resource_type = 'policy'
      where c.doctor_email = public.current_jwt_email()
        and c.status = 'active'
        and c.expires_at > now()
        and p.document_path is not null
        and p.document_path = name
    )
  );

create policy "Doctors can read consented medical record docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-records'
    and (
      exists (
        select 1
        from public.visit_consent_items i
        join public.visit_consents c on c.id = i.consent_id
        join public.medical_records r
          on r.id = i.resource_id
         and i.resource_type = 'medical_record'
        where c.doctor_email = public.current_jwt_email()
          and c.status = 'active'
          and c.expires_at > now()
          and r.document_path is not null
          and r.document_path = name
      )
      or exists (
        select 1
        from public.visit_consent_items i
        join public.visit_consents c on c.id = i.consent_id
        join public.medical_record_documents d
          on d.record_id = i.resource_id
         and i.resource_type = 'medical_record'
        where c.doctor_email = public.current_jwt_email()
          and c.status = 'active'
          and c.expires_at > now()
          and d.document_path = name
      )
    )
  );

create or replace function public.create_visit_consent(
  p_doctor_email text,
  p_expires_at timestamptz,
  p_items jsonb
)
returns public.visit_consents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_my_email text := public.current_jwt_email();
  v_elem jsonb;
  v_type text;
  v_id uuid;
  v_consent public.visit_consents%rowtype;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(trim(coalesce(p_doctor_email, '')));
  if v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter a valid doctor email';
  end if;

  if v_my_email = v_email then
    raise exception 'You cannot grant a visit pack to your own email';
  end if;

  if p_expires_at <= now() + interval '30 minutes' then
    raise exception 'Visit access must last more than 30 minutes';
  end if;

  if p_expires_at > now() + interval '7 days 1 hour' then
    raise exception 'Visit access cannot exceed 7 days';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Pick at least one policy or medical record';
  end if;

  if jsonb_array_length(p_items) > 40 then
    raise exception 'Too many items in this visit pack';
  end if;

  insert into public.visit_consents (patient_user_id, doctor_email, status, expires_at)
  values (v_uid, v_email, 'active', p_expires_at)
  returning * into v_consent;

  for v_elem in select value from jsonb_array_elements(p_items)
  loop
    v_type := v_elem->>'resource_type';
    begin
      v_id := (v_elem->>'resource_id')::uuid;
    exception
      when others then
        raise exception 'Each item needs a valid id';
    end;

    if v_type is distinct from 'policy' and v_type is distinct from 'medical_record' then
      raise exception 'Visit packs can only include policies or medical records';
    end if;

    insert into public.visit_consent_items (consent_id, resource_type, resource_id)
    values (v_consent.id, v_type::public.vault_resource_type, v_id);

    v_count := v_count + 1;
  end loop;

  if v_count < 1 then
    raise exception 'Pick at least one policy or medical record';
  end if;

  return v_consent;
end;
$$;

create or replace function public.revoke_visit_consent(p_consent_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.visit_consents%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.visit_consents
  where id = p_consent_id
  for update;

  if not found then
    raise exception 'Visit pack not found';
  end if;

  if v_row.patient_user_id <> v_uid then
    raise exception 'Only the patient can revoke this visit pack';
  end if;

  if v_row.status = 'revoked' then
    return;
  end if;

  update public.visit_consents
  set
    status = 'revoked',
    revoked_at = now(),
    updated_at = now()
  where id = p_consent_id;
end;
$$;

revoke all on function public.create_visit_consent(text, timestamptz, jsonb) from public;
revoke all on function public.create_visit_consent(text, timestamptz, jsonb) from anon;
revoke all on function public.revoke_visit_consent(uuid) from public;
revoke all on function public.revoke_visit_consent(uuid) from anon;
grant execute on function public.create_visit_consent(text, timestamptz, jsonb) to authenticated;
grant execute on function public.revoke_visit_consent(uuid) to authenticated;
