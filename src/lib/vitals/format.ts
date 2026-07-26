import type { VitalType } from '@/lib/supabase/database.types';

export const VITAL_TYPES: {
  value: VitalType;
  label: string;
  unit: string;
  icon: 'heart' | 'water' | 'fitness';
  tint: 'red' | 'violet' | 'teal';
  hint: string;
}[] = [
  {
    value: 'blood_pressure',
    label: 'Blood pressure',
    unit: 'mmHg',
    icon: 'heart',
    tint: 'red',
    hint: 'Systolic / diastolic (e.g. 120 / 80)',
  },
  {
    value: 'blood_sugar',
    label: 'Blood sugar',
    unit: 'mg/dL',
    icon: 'water',
    tint: 'violet',
    hint: 'India-common unit. Note fasting or after meal if useful.',
  },
  {
    value: 'weight',
    label: 'Weight',
    unit: 'kg',
    icon: 'fitness',
    tint: 'teal',
    hint: 'Body weight in kilograms',
  },
];

export function vitalTypeMeta(type: VitalType) {
  return VITAL_TYPES.find((item) => item.value === type) ?? VITAL_TYPES[0];
}

export function vitalTypeLabel(type: VitalType) {
  return vitalTypeMeta(type).label;
}

export function formatVitalValue(
  type: VitalType,
  primary: number | string,
  secondary: number | string | null | undefined,
  unit?: string | null
) {
  const meta = vitalTypeMeta(type);
  const displayUnit = unit?.trim() || meta.unit;
  if (type === 'blood_pressure') {
    return `${primary} / ${secondary ?? '—'} ${displayUnit}`;
  }
  return `${primary} ${displayUnit}`;
}

export function defaultUnit(type: VitalType) {
  return vitalTypeMeta(type).unit;
}

/** Local `YYYY-MM-DD` + `HH:mm` → ISO timestamptz string. */
export function combineLocalDateTime(dateISO: string, timeHHMM: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeHHMM.trim());
  if (!dateMatch || !timeMatch) {
    return null;
  }
  const y = Number(dateMatch[1]);
  const mo = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const h = Number(timeMatch[1]);
  const mi = Number(timeMatch[2]);
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date.toISOString();
}

export function splitLocalDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) {
    return { date: '', time: '' };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return { date: `${y}-${m}-${d}`, time: `${h}:${mi}` };
}

export function formatVitalWhen(iso: string | null | undefined) {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function nowLocalTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
