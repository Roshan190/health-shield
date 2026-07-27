-- Tighten D-018 RPC grants: authenticated only (not anon)

revoke execute on function public.accept_household_invite(uuid) from anon;
revoke execute on function public.revoke_vault_membership(uuid) from anon;
revoke execute on function public.is_active_vault_member(uuid, uuid) from anon;
revoke execute on function public.can_view_shared_resource(uuid, public.vault_resource_type, uuid) from anon;
