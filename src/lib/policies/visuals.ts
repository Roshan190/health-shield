import type { Ionicons } from '@expo/vector-icons';

import type { TintName } from '@/constants/theme';
import type { RenewalTone } from '@/lib/policies/format';
import type { PolicyType } from '@/lib/supabase/database.types';

type PolicyVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
};

/** Icon + tint identity per policy type, used across cards and lists. */
export const POLICY_VISUALS: Record<PolicyType, PolicyVisual> = {
  health: { icon: 'medkit', tint: 'teal' },
  term: { icon: 'umbrella', tint: 'blue' },
  life: { icon: 'heart', tint: 'violet' },
  personal_accident: { icon: 'bandage', tint: 'amber' },
  critical_illness: { icon: 'pulse', tint: 'red' },
  other: { icon: 'shield-half', tint: 'slate' },
};

export function policyVisual(type: PolicyType): PolicyVisual {
  return POLICY_VISUALS[type] ?? POLICY_VISUALS.other;
}

/** Chip tint matching a renewal tone. */
export const RENEWAL_TONE_TINT: Record<RenewalTone, TintName> = {
  danger: 'red',
  warning: 'amber',
  muted: 'slate',
};
