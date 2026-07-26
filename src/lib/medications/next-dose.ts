import type { Medication } from '@/lib/supabase/database.types';

export type NextDose = {
  medication: Medication;
  time: string;
  /** Minutes from now until the dose (0–1439). */
  minutesUntil: number;
  /** True when the chosen slot is tomorrow (all of today’s times already passed). */
  isTomorrow: boolean;
};

function parseHHMM(time: string): { hour: number; minute: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Format HH:mm for display (en-IN friendly 12h). */
export function formatDoseTime(time: string) {
  const parsed = parseHHMM(time);
  if (!parsed) {
    return time;
  }
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Next upcoming dose among active meds with reminders enabled.
 * Picks the soonest HH:mm today; if none remain, the earliest tomorrow.
 */
export function findNextDose(medications: Medication[], now = new Date()): NextDose | null {
  const candidates = medications.filter(
    (m) => m.active && m.reminder_enabled && m.reminder_times.length > 0
  );
  if (candidates.length === 0) {
    return null;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: NextDose | null = null;

  for (const medication of candidates) {
    for (const raw of medication.reminder_times) {
      const parsed = parseHHMM(raw);
      if (!parsed) {
        continue;
      }
      const time = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
      const doseMinutes = parsed.hour * 60 + parsed.minute;
      const isTomorrow = doseMinutes <= nowMinutes;
      const minutesUntil = isTomorrow
        ? doseMinutes + 24 * 60 - nowMinutes
        : doseMinutes - nowMinutes;

      if (!best || minutesUntil < best.minutesUntil) {
        best = { medication, time, minutesUntil, isTomorrow };
      }
    }
  }

  return best;
}

export function nextDoseLabel(next: NextDose) {
  const when = formatDoseTime(next.time);
  if (next.isTomorrow) {
    return `Tomorrow · ${when}`;
  }
  if (next.minutesUntil < 60) {
    return next.minutesUntil <= 1 ? 'Due now' : `In ${next.minutesUntil} min · ${when}`;
  }
  return `Today · ${when}`;
}
