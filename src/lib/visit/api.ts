import { getSupabase } from '@/lib/supabase/client';
import type {
  VisitConsent,
  VisitConsentItem,
  VaultResourceType,
} from '@/lib/supabase/database.types';

export const VISIT_DISCLAIMER =
  'HealthShield does not employ doctors and does not verify medical credentials. Anyone who can sign in with the email you enter can view this pack until you revoke it or it expires. This is not a diagnosis and not family sharing.';

export const VISIT_DURATIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
] as const;

export function doctorPortalUrl() {
  const raw = process.env.EXPO_PUBLIC_DOCTOR_PORTAL_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export function isVisitLive(consent: VisitConsent, now = new Date()) {
  return consent.status === 'active' && new Date(consent.expires_at) > now;
}

export function visitStatusLabel(consent: VisitConsent, now = new Date()) {
  if (consent.status === 'revoked') {
    return 'Revoked';
  }
  if (new Date(consent.expires_at) <= now) {
    return 'Expired';
  }
  return 'Live';
}

export function visitStatusTint(consent: VisitConsent, now = new Date()) {
  if (consent.status === 'revoked' || new Date(consent.expires_at) <= now) {
    return 'slate' as const;
  }
  return 'green' as const;
}

export async function listVisitConsents() {
  const { data, error } = await getSupabase()
    .from('visit_consents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as VisitConsent[];
}

export async function listVisitConsentItems(consentId: string) {
  const { data, error } = await getSupabase()
    .from('visit_consent_items')
    .select('*')
    .eq('consent_id', consentId);
  if (error) {
    throw error;
  }
  return (data ?? []) as VisitConsentItem[];
}

export async function createVisitConsent(input: {
  doctorEmail: string;
  hours: number;
  items: { resource_type: VaultResourceType; resource_id: string }[];
}) {
  const expires = new Date(Date.now() + input.hours * 60 * 60 * 1000);
  const { data, error } = await getSupabase().rpc('create_visit_consent', {
    p_doctor_email: input.doctorEmail.trim().toLowerCase(),
    p_expires_at: expires.toISOString(),
    p_items: input.items,
  });
  if (error) {
    throw error;
  }
  return data as VisitConsent;
}

export async function revokeVisitConsent(consentId: string) {
  const { error } = await getSupabase().rpc('revoke_visit_consent', {
    p_consent_id: consentId,
  });
  if (error) {
    throw error;
  }
}
