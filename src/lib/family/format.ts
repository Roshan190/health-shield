import type { FamilyRelationship, FamilyRole } from '@/lib/supabase/database.types';

export const FAMILY_RELATIONSHIPS: { value: FamilyRelationship; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
];

export const FAMILY_ROLES: { value: FamilyRole; label: string; hint: string }[] = [
  {
    value: 'viewer',
    label: 'Viewer (intent)',
    hint: 'Saved for later. Does not grant a login or access to your policies/records today.',
  },
  {
    value: 'manager',
    label: 'Manager (intent)',
    hint: 'Saved for later. Does not grant a login or edit rights until invite/share ships.',
  },
];

export function relationshipLabel(value: FamilyRelationship) {
  return FAMILY_RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}

export function roleLabel(value: FamilyRole) {
  return FAMILY_ROLES.find((r) => r.value === value)?.label ?? value;
}
