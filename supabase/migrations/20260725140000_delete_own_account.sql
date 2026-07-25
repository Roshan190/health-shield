-- Applied remotely via MCP as delete_own_account (2026-07-25)
-- Allows an authenticated user to delete their auth.users row (cascades app data).
-- Storage objects must be removed by the client before calling this RPC.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_own_account() is
  'DPDP-minded account deletion: caller must own the session; cascades profiles/policies/records/family via FK.';

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
