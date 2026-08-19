import { getSupabase } from '@/lib/supabase/client';
import type { Claim, ClaimStatus } from '@/lib/supabase/database.types';

/** Honest product copy — HealthShield organizes, it does not file. */
export const CLAIM_DISCLAIMER =
  'HealthShield helps you gather documents. It does not file claims with insurers or guarantee payouts.';

export const CLAIM_STATUSES: { value: ClaimStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'more_info', label: 'More info' },
  { value: 'settled', label: 'Settled' },
];

export const DEFAULT_CLAIM_CHECKLIST: { key: string; label: string }[] = [
  { key: 'discharge_summary', label: 'Discharge summary' },
  { key: 'hospital_bills', label: 'Final hospital bill / invoices' },
  { key: 'pharmacy_bills', label: 'Pharmacy / medicine bills' },
  { key: 'investigation_reports', label: 'Lab / scan / investigation reports' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'claim_form', label: 'Insurer claim form' },
  { key: 'id_proof', label: 'ID / KYC of patient' },
  { key: 'policy_copy', label: 'Policy copy' },
  { key: 'cancelled_cheque', label: 'Cancelled cheque / bank details' },
  { key: 'indoor_case_papers', label: 'Indoor case papers (if asked)' },
];

export function claimStatusLabel(status: ClaimStatus) {
  return CLAIM_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function claimStatusTint(status: ClaimStatus) {
  switch (status) {
    case 'submitted':
      return 'blue' as const;
    case 'more_info':
      return 'amber' as const;
    case 'settled':
      return 'green' as const;
    default:
      return 'slate' as const;
  }
}

export async function createClaimWithChecklist(input: {
  userId: string;
  policyId: string;
  hospitalName?: string | null;
  notes?: string | null;
}): Promise<Claim> {
  const supabase = getSupabase();
  const hospital = input.hospitalName?.trim() || null;
  const notes = input.notes?.trim() || null;

  const { data: claim, error } = await supabase
    .from('claims')
    .insert({
      user_id: input.userId,
      policy_id: input.policyId,
      status: 'draft',
      hospital_name: hospital,
      notes,
    })
    .select('*')
    .single();

  if (error || !claim) {
    throw error ?? new Error('Could not create claim');
  }

  const rows = DEFAULT_CLAIM_CHECKLIST.map((item, index) => ({
    claim_id: claim.id,
    user_id: input.userId,
    item_key: item.key,
    label: item.label,
    sort_order: index,
    done: false,
  }));

  const { error: itemsError } = await supabase.from('claim_checklist_items').insert(rows);
  if (itemsError) {
    await supabase.from('claims').delete().eq('id', claim.id);
    throw itemsError;
  }

  return claim;
}
