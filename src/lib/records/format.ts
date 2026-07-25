import type { Ionicons } from '@expo/vector-icons';

import type { TintName } from '@/constants/theme';
import type { MedicalRecord, RecordCategory } from '@/lib/supabase/database.types';

export const RECORD_CATEGORIES: { value: RecordCategory; label: string }[] = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'scan', label: 'Scan' },
  { value: 'bill', label: 'Bill' },
  { value: 'discharge_summary', label: 'Discharge summary' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'other', label: 'Other' },
];

export function recordCategoryLabel(category: RecordCategory) {
  return RECORD_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

type RecordVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
};

/** Icon + tint identity per record category, used across cards and lists. */
export const RECORD_VISUALS: Record<RecordCategory, RecordVisual> = {
  prescription: { icon: 'medkit', tint: 'teal' },
  lab_report: { icon: 'flask', tint: 'violet' },
  scan: { icon: 'scan', tint: 'blue' },
  bill: { icon: 'receipt', tint: 'amber' },
  discharge_summary: { icon: 'document-text', tint: 'green' },
  vaccination: { icon: 'bandage', tint: 'red' },
  other: { icon: 'folder', tint: 'slate' },
};

export function recordVisual(category: RecordCategory): RecordVisual {
  return RECORD_VISUALS[category] ?? RECORD_VISUALS.other;
}

/** Parse a comma-separated tags string into a clean array. */
export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Basic client-side search across title, tags, and notes.
 * Fine for Foundation volumes; move server-side if libraries grow large.
 */
export function matchesRecordQuery(record: MedicalRecord, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    record.title.toLowerCase().includes(q) ||
    record.tags.some((tag) => tag.includes(q)) ||
    (record.notes ?? '').toLowerCase().includes(q) ||
    recordCategoryLabel(record.category).toLowerCase().includes(q)
  );
}

/** Group key for the timeline, e.g. "August 2026". Falls back for undated records. */
export function recordTimelineGroup(record: MedicalRecord) {
  const value = record.record_date ?? record.created_at.slice(0, 10);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Undated';
  }
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
