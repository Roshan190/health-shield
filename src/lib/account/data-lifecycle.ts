import { Share } from 'react-native';

import { clearAppleHealthPrefs } from '@/lib/apple-health/preferences';
import { clearEmergencyCardSnapshot } from '@/lib/emergency/card-store';
import { clearSosSession } from '@/lib/emergency/sos-session';
import { clearHealthConnectPrefs } from '@/lib/health-connect/preferences';
import { getSupabase } from '@/lib/supabase/client';

type ExportPayload = {
  exportedAt: string;
  profile: unknown;
  policies: unknown[];
  medical_records: unknown[];
  family_members: unknown[];
  vitals: unknown[];
  medications: unknown[];
  platform_health_daily: unknown[];
  claims: unknown[];
  claim_checklist_items: unknown[];
  visit_consents: unknown[];
  visit_consent_items: unknown[];
};

/** Gather owner data for DPDP-minded export (share sheet). */
export async function exportAccountData(userId: string) {
  const supabase = getSupabase();
  const [
    profileRes,
    policiesRes,
    recordsRes,
    familyRes,
    vitalsRes,
    medsRes,
    platformRes,
    claimsRes,
    checklistRes,
    consentsRes,
    consentItemsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('policies').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('medical_records').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('family_members').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('vitals').select('*').eq('user_id', userId).order('recorded_at'),
    supabase.from('medications').select('*').eq('user_id', userId).order('created_at'),
    supabase
      .from('platform_health_daily')
      .select('*')
      .eq('user_id', userId)
      .order('day', { ascending: false }),
    supabase.from('claims').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('claim_checklist_items').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('visit_consents').select('*').eq('patient_user_id', userId).order('created_at'),
    supabase.from('visit_consent_items').select('*'),
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
  if (vitalsRes.error) {
    throw vitalsRes.error;
  }
  if (medsRes.error) {
    throw medsRes.error;
  }
  if (platformRes.error) {
    throw platformRes.error;
  }
  if (claimsRes.error) {
    throw claimsRes.error;
  }
  if (checklistRes.error) {
    throw checklistRes.error;
  }
  if (consentsRes.error) {
    throw consentsRes.error;
  }
  if (consentItemsRes.error) {
    throw consentItemsRes.error;
  }

  const consentIds = new Set((consentsRes.data ?? []).map((row) => row.id));
  const visitItems = (consentItemsRes.data ?? []).filter((row) => consentIds.has(row.consent_id));

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    profile: profileRes.data,
    policies: policiesRes.data ?? [],
    medical_records: recordsRes.data ?? [],
    family_members: familyRes.data ?? [],
    vitals: vitalsRes.data ?? [],
    medications: medsRes.data ?? [],
    platform_health_daily: platformRes.data ?? [],
    claims: claimsRes.data ?? [],
    claim_checklist_items: checklistRes.data ?? [],
    visit_consents: consentsRes.data ?? [],
    visit_consent_items: visitItems,
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
    supabase.from('claim_checklist_items').delete().eq('user_id', userId),
    supabase.from('claims').delete().eq('user_id', userId),
    supabase.from('medical_records').delete().eq('user_id', userId),
    supabase.from('policies').delete().eq('user_id', userId),
    supabase.from('family_members').delete().eq('user_id', userId),
    supabase.from('vitals').delete().eq('user_id', userId),
    supabase.from('medications').delete().eq('user_id', userId),
    supabase.from('platform_health_daily').delete().eq('user_id', userId),
  ]);

  await clearEmergencyCardSnapshot();
  await clearSosSession();
  await clearHealthConnectPrefs();
  await clearAppleHealthPrefs();

  const { error: rpcError } = await supabase.rpc('delete_own_account');
  if (rpcError) {
    throw rpcError;
  }

  await supabase.auth.signOut();
}
