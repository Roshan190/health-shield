import { syncMedicationNotifications } from '@/lib/notifications/medications';
import { syncRenewalNotifications } from '@/lib/notifications/renewals';
import type { NotificationCapability } from '@/lib/notifications/runtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export type AllRemindersSyncResult = {
  renewalsScheduled: number;
  medicationsScheduled: number;
  capability: NotificationCapability;
};

let syncInFlight: Promise<AllRemindersSyncResult> | null = null;

/**
 * Fetch policies + medications and reschedule local reminders.
 * Dedupes concurrent calls (focus + AppState can overlap).
 */
export async function resyncAllLocalReminders(): Promise<AllRemindersSyncResult | null> {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const supabase = getSupabase();
    const [policiesRes, medsRes] = await Promise.all([
      supabase.from('policies').select('*').order('renewal_date', { ascending: true }),
      supabase.from('medications').select('*').order('updated_at', { ascending: false }),
    ]);

    const renewals = await syncRenewalNotifications(policiesRes.data ?? []);
    const medications = await syncMedicationNotifications(medsRes.data ?? []);

    // Prefer the more actionable capability (denied/unsupported over granted if mixed).
    const capability =
      renewals.capability.status !== 'granted'
        ? renewals.capability
        : medications.capability;

    return {
      renewalsScheduled: renewals.scheduled,
      medicationsScheduled: medications.scheduled,
      capability,
    };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
