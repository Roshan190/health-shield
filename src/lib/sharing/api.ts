import { getSupabase } from '@/lib/supabase/client';
import type {
  HouseholdInvite,
  VaultItemShare,
  VaultMembership,
  VaultResourceType,
} from '@/lib/supabase/database.types';

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listOutgoingInvites(ownerUserId: string) {
  const { data, error } = await getSupabase()
    .from('household_invites')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as HouseholdInvite[];
}

export async function listIncomingPendingInvites() {
  const { data, error } = await getSupabase()
    .from('household_invites')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as HouseholdInvite[];
}

export async function createHouseholdInvite(ownerUserId: string, email: string) {
  const inviteeEmail = normalizeInviteEmail(email);
  if (!inviteeEmail.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  const { data: sessionData } = await getSupabase().auth.getUser();
  const myEmail = sessionData.user?.email?.toLowerCase();
  if (myEmail && myEmail === inviteeEmail) {
    throw new Error('You cannot invite your own email.');
  }

  const { data, error } = await getSupabase()
    .from('household_invites')
    .insert({
      owner_user_id: ownerUserId,
      invitee_email: inviteeEmail,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A pending invite already exists for that email.');
    }
    throw error;
  }
  return data as HouseholdInvite;
}

export async function cancelHouseholdInvite(inviteId: string) {
  const { error } = await getSupabase()
    .from('household_invites')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'pending');
  if (error) {
    throw error;
  }
}

export async function acceptHouseholdInvite(inviteId: string) {
  const { data, error } = await getSupabase().rpc('accept_household_invite', {
    p_invite_id: inviteId,
  });
  if (error) {
    throw error;
  }
  return data as VaultMembership;
}

export async function listOwnedMemberships(ownerUserId: string) {
  const { data, error } = await getSupabase()
    .from('vault_memberships')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as VaultMembership[];
}

export async function listJoinedMemberships(memberUserId: string) {
  const { data, error } = await getSupabase()
    .from('vault_memberships')
    .select('*')
    .eq('member_user_id', memberUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as VaultMembership[];
}

export async function revokeVaultMembership(membershipId: string) {
  const { error } = await getSupabase().rpc('revoke_vault_membership', {
    p_membership_id: membershipId,
  });
  if (error) {
    throw error;
  }
}

export async function listSharesForResource(
  ownerUserId: string,
  resourceType: VaultResourceType,
  resourceId: string
) {
  const { data, error } = await getSupabase()
    .from('vault_item_shares')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);
  if (error) {
    throw error;
  }
  return (data ?? []) as VaultItemShare[];
}

export async function shareVaultItem(params: {
  ownerUserId: string;
  memberUserId: string;
  resourceType: VaultResourceType;
  resourceId: string;
}) {
  const { data, error } = await getSupabase()
    .from('vault_item_shares')
    .insert({
      owner_user_id: params.ownerUserId,
      member_user_id: params.memberUserId,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
  return data as VaultItemShare;
}

export async function unshareVaultItem(shareId: string) {
  const { error } = await getSupabase().from('vault_item_shares').delete().eq('id', shareId);
  if (error) {
    throw error;
  }
}
