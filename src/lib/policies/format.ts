import { formatDisplayDate, parseISODate } from '@/lib/dates';
import type { PolicyType } from '@/lib/supabase/database.types';

export const POLICY_TYPES: { value: PolicyType; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'term', label: 'Term' },
  { value: 'life', label: 'Life' },
  { value: 'personal_accident', label: 'Personal accident' },
  { value: 'critical_illness', label: 'Critical illness' },
  { value: 'other', label: 'Other' },
];

export const PREMIUM_FREQUENCIES = ['annual', 'half_yearly', 'quarterly', 'monthly', 'one_time'] as const;

export function policyTypeLabel(type: PolicyType) {
  return POLICY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function formatInr(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/** Compact Indian currency: ₹5L, ₹1.5Cr. For stat tiles where space is tight. */
export function formatInrCompact(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return '—';
  }
  const n = Number(amount);
  if (n >= 1_00_00_000) {
    const crores = n / 1_00_00_000;
    return `₹${crores % 1 === 0 ? crores : crores.toFixed(1)}Cr`;
  }
  if (n >= 1_00_000) {
    const lakhs = n / 1_00_000;
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
  }
  return formatInr(n);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
  if (!parseISODate(value)) {
    return value;
  }
  return formatDisplayDate(value);
}

/** Days until renewal; negative if past. null if no date. */
export function daysUntil(renewalDate: string | null | undefined) {
  const target = parseISODate(renewalDate);
  if (!target) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function renewalLabel(renewalDate: string | null | undefined) {
  const days = daysUntil(renewalDate);
  if (days == null) {
    return 'No renewal date';
  }
  if (days < 0) {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  }
  if (days === 0) {
    return 'Renews today';
  }
  if (days <= 30) {
    return `Renews in ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Renews ${formatDate(renewalDate)}`;
}

export function isRenewalSoon(renewalDate: string | null | undefined, withinDays = 45) {
  const days = daysUntil(renewalDate);
  return days != null && days <= withinDays;
}

export type RenewalTone = 'danger' | 'warning' | 'muted';

/** Semantic tone for a renewal date: overdue = danger, ≤30d = warning, else muted. */
export function renewalTone(renewalDate: string | null | undefined): RenewalTone {
  const days = daysUntil(renewalDate);
  if (days == null) {
    return 'muted';
  }
  if (days < 0) {
    return 'danger';
  }
  if (days <= 30) {
    return 'warning';
  }
  return 'muted';
}
