const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function isValidReminderTime(value: string) {
  return TIME_RE.test(value.trim());
}

/** Normalize and dedupe HH:mm times; drop blanks/invalids. */
export function normalizeReminderTimes(times: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of times) {
    const t = raw.trim();
    if (!isValidReminderTime(t)) {
      continue;
    }
    const [h, m] = t.split(':');
    const normalized = `${h.padStart(2, '0')}:${m}`;
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out.sort();
}

export function reminderSummary(enabled: boolean, times: string[]) {
  if (!enabled || times.length === 0) {
    return 'Reminders off';
  }
  return `Daily · ${times.join(', ')}`;
}
