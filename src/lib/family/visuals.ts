import type { Ionicons } from '@expo/vector-icons';

import type { TintName } from '@/constants/theme';
import type { FamilyRelationship, FamilyRole } from '@/lib/supabase/database.types';

export function memberVisual(relationship: FamilyRelationship): {
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
} {
  switch (relationship) {
    case 'spouse':
      return { icon: 'heart', tint: 'red' };
    case 'child':
      return { icon: 'happy', tint: 'amber' };
    case 'parent':
      return { icon: 'people', tint: 'blue' };
    case 'sibling':
      return { icon: 'people-circle', tint: 'teal' };
    case 'grandparent':
      return { icon: 'home', tint: 'violet' };
    default:
      return { icon: 'person', tint: 'slate' };
  }
}

export function roleTint(role: FamilyRole): TintName {
  return role === 'manager' ? 'blue' : 'slate';
}
