-- Multiple documents per medical record (scan + report together)
create table public.medical_record_documents (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_path text not null,
  document_name text not null,
  document_mime text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint medical_record_documents_path_unique unique (document_path),
  constraint medical_record_documents_name_not_blank check (char_length(trim(document_name)) > 0)
);

comment on table public.medical_record_documents is
  'Files attached to a medical record (e.g. scan + report). medical_records.document_* remains the primary/first file for list + legacy share.';

create index medical_record_documents_record_idx
  on public.medical_record_documents (record_id, sort_order, created_at);

create index medical_record_documents_user_idx
  on public.medical_record_documents (user_id);

grant select, insert, update, delete on table public.medical_record_documents to authenticated;
grant select, insert, update, delete on table public.medical_record_documents to service_role;

alter table public.medical_record_documents enable row level security;

create policy "Owners manage own record documents"
  on public.medical_record_documents for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members can read shared record documents"
  on public.medical_record_documents for select to authenticated
  using (
    exists (
      select 1
      from public.vault_item_shares s
      join public.vault_memberships m
        on m.owner_user_id = s.owner_user_id
       and m.member_user_id = s.member_user_id
       and m.status = 'active'
      where s.resource_type = 'medical_record'
        and s.resource_id = medical_record_documents.record_id
        and s.member_user_id = (select auth.uid())
    )
  );

insert into public.medical_record_documents (
  record_id, user_id, document_path, document_name, document_mime, sort_order, created_at
)
select
  r.id,
  r.user_id,
  r.document_path,
  coalesce(nullif(trim(r.document_name), ''), 'document'),
  coalesce(nullif(trim(r.document_mime), ''), 'application/pdf'),
  0,
  coalesce(r.created_at, now())
from public.medical_records r
where r.document_path is not null
  and not exists (
    select 1 from public.medical_record_documents d where d.document_path = r.document_path
  );

drop policy if exists "Members can read shared medical record docs" on storage.objects;

create policy "Members can read shared medical record docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-records'
    and (
      exists (
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
      or exists (
        select 1
        from public.vault_item_shares s
        join public.medical_record_documents d
          on d.record_id = s.resource_id
         and s.resource_type = 'medical_record'
        join public.vault_memberships m
          on m.owner_user_id = s.owner_user_id
         and m.member_user_id = s.member_user_id
         and m.status = 'active'
        where s.member_user_id = (select auth.uid())
          and d.document_path = name
      )
    )
  );
