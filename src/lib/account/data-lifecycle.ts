import { Share } from 'react-native';

import { clearEmergencyCardSnapshot } from '@/lib/emergency/card-store';
import { getSupabase } from '@/lib/supabase/client';

type ExportPayload = {
  exportedAt: string;
  profile: unknown;
  policies: unknown[];
  medical_records: unknown[];
  family_members: unknown[];
};

/** Gather owner data for DPDP-minded export (share sheet). */
export async function exportAccountData(userId: string) {
  const supabase = getSupabase();
  const [profileRes, policiesRes, recordsRes, familyRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('policies').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('medical_records').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('family_members').select('*').eq('user_id', userId).order('created_at'),
  ]);

  if (profileRes.error) {
    throw profileRes.error;
  }
  if (policiesRes.error) {
    throw policiesRes.error;
  }
  if (recordsRes.error) {
    throw recordsRes.error;
  }
  if (familyRes.error) {
    throw familyRes.error;
  }

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    profile: profileRes.data,
    policies: policiesRes.data ?? [],
    medical_records: recordsRes.data ?? [],
    family_members: familyRes.data ?? [],
  };

  await Share.share({
    title: 'HealthShield data export',
    message: JSON.stringify(payload, null, 2),
  });

  return payload;
}

/** Wipe storage objects, rows, local cache, then delete auth user via RPC. */
export async function deleteAccountCompletely(userId: string) {
  const supabase = getSupabase();

  const [policiesRes, recordsRes] = await Promise.all([
    supabase.from('policies').select('document_path').eq('user_id', userId),
    supabase.from('medical_records').select('document_path').eq('user_id', userId),
  ]);

  if (policiesRes.error) {
    throw policiesRes.error;
  }
  if (recordsRes.error) {
    throw recordsRes.error;
  }

  const policyPaths = (policiesRes.data ?? [])
    .map((row) => row.document_path)
    .filter((path): path is string => Boolean(path));
  const recordPaths = (recordsRes.data ?? [])
    .map((row) => row.document_path)
    .filter((path): path is string => Boolean(path));

  if (policyPaths.length) {
    await supabase.storage.from('policy-docs').remove(policyPaths);
  }
  if (recordPaths.length) {
    await supabase.storage.from('medical-records').remove(recordPaths);
  }

  await Promise.all([
    supabase.from('medical_records').delete().eq('user_id', userId),
    supabase.from('policies').delete().eq('user_id', userId),
    supabase.from('family_members').delete().eq('user_id', userId),
  ]);

  await clearEmergencyCardSnapshot();

  const { error: rpcError } = await supabase.rpc('delete_own_account');
  if (rpcError) {
    throw rpcError;
  }

  await supabase.auth.signOut();
}
