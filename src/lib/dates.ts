/** Local calendar date helpers — avoid UTC shift from `toISOString()`. */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Normalize API / form values to `YYYY-MM-DD`.
 * Accepts plain dates or ISO timestamps (takes the calendar prefix).
 */
export function normalizeISODate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) {
    return null;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(y, m - 1, d);
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getFullYear() !== y ||
    probe.getMonth() !== m - 1 ||
    probe.getDate() !== d
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Parse `YYYY-MM-DD` as a local Date (midnight). Invalid input → null. */
export function parseISODate(value: string | null | undefined): Date | null {
  const normalized = normalizeISODate(value);
  if (!normalized) {
    return null;
  }
  const [ys, ms, ds] = normalized.split('-');
  return new Date(Number(ys), Number(ms) - 1, Number(ds));
}

/**
 * Date safe for native pickers that call `toISOString()` (Android @expo/ui).
 * Local midnight → ISO often lands on the previous UTC day (e.g. IST), so the
 * dialog opens one day early. UTC noon keeps the calendar day stable.
 */
export function toPickerDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
}

/** Commit a picker selection back to `YYYY-MM-DD` using local calendar parts. */
export function toISODateFromPicker(date: Date): string {
  return toISODate(date);
}

export function formatDisplayDate(value: string | null | undefined) {
  const date = parseISODate(value);
  if (!date) {
    return value || '';
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
