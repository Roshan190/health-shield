import type { TintName } from '@/constants/theme';
import type { VitalType } from '@/lib/supabase/database.types';
import { vitalTypeMeta } from '@/lib/vitals/format';

export function vitalVisual(type: VitalType): {
  icon: 'heart' | 'water' | 'fitness';
  tint: TintName;
} {
  const meta = vitalTypeMeta(type);
  return { icon: meta.icon, tint: meta.tint };
}
