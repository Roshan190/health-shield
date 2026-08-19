import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  isValidReminderTime,
  normalizeReminderTimes,
  reminderSummary,
} from '@/lib/medications/format';
import { syncMedicationNotifications } from '@/lib/notifications/medications';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type { Medication } from '@/lib/supabase/database.types';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  dose: z.string().trim(),
  instructions: z.string().trim(),
  started_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')
    .or(z.literal('')),
  notes: z.string().trim(),
  reminder_enabled: z.boolean(),
  active: z.boolean(),
  time1: z.string().trim(),
  time2: z.string().trim(),
  time3: z.string().trim(),
});

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [medication, setMedication] = useState<Medication | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startedOn, setStartedOn] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [active, setActive] = useState(true);
  const [time1, setTime1] = useState('');
  const [time2, setTime2] = useState('');
  const [time3, setTime3] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hydrate = useCallback((row: Medication) => {
    setMedication(row);
    setName(row.name);
    setDose(row.dose ?? '');
    setInstructions(row.instructions ?? '');
    setStartedOn(row.started_on ?? '');
    setNotes(row.notes ?? '');
    setReminderEnabled(row.reminder_enabled);
    setActive(row.active);
    setTime1(row.reminder_times[0] ?? '');
    setTime2(row.reminder_times[1] ?? '');
    setTime3(row.reminder_times[2] ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const { data, error: loadError } = await getSupabase()
      .from('medications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
    } else if (!data) {
      setError('Medication not found');
    } else {
      hydrate(data);
      setError(null);
    }
    setLoading(false);
  }, [hydrate, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function resyncAll() {
    const { data } = await getSupabase()
      .from('medications')
      .select('*')
      .order('name', { ascending: true });
    await syncMedicationNotifications(data ?? []);
  }

  async function onSave() {
    if (!user || !id) {
      return;
    }
    setError(null);
    setStatus(null);

    const parsed = schema.safeParse({
      name,
      dose,
      instructions,
      started_on: startedOn,
      notes,
      reminder_enabled: reminderEnabled,
      active,
      time1,
      time2,
      time3,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    const rawTimes = [parsed.data.time1, parsed.data.time2, parsed.data.time3].filter(
      (t) => t.length > 0
    );
    for (const t of rawTimes) {
      if (!isValidReminderTime(t)) {
        setError(`Invalid time "${t}" — use HH:mm`);
        return;
      }
    }
    const reminderTimes = normalizeReminderTimes(rawTimes);

    if (parsed.data.reminder_enabled && reminderTimes.length === 0) {
      setError('Add at least one reminder time (HH:mm), or turn reminders off');
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await getSupabase()
      .from('medications')
      .update({
        name: parsed.data.name,
        dose: parsed.data.dose || null,
        instructions: parsed.data.instructions || null,
        started_on: parsed.data.started_on || null,
        notes: parsed.data.notes || null,
        reminder_enabled: parsed.data.reminder_enabled,
        reminder_times: reminderTimes,
        active: parsed.data.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    setSaving(false);

    if (saveError || !data) {
      setError(saveError?.message ?? 'Could not save');
      return;
    }

    hydrate(data);
    setStatus('Medication updated.');
    void resyncAll();
  }

  function onDelete() {
    if (!id) {
      return;
    }
    Alert.alert('Remove medication?', 'This removes it from your list and cancels its reminders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await getSupabase()
            .from('medications')
            .delete()
            .eq('id', id);
          if (deleteError) {
            setError(deleteError.message);
            return;
          }
          void resyncAll();
          router.replace('/health/medications');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Medication" subtitle="Loading…">
        <Card>
          <Skeleton width="60%" height={22} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      </Screen>
    );
  }

  if (!medication) {
    return (
      <Screen title="Medication" subtitle="Not found">
        <EmptyState
          icon="cloud-offline"
          tint="red"
          title="Couldn't open this medication"
          message={error ?? 'Medication not found'}>
          <Button
            label="Back to medications"
            variant="secondary"
            onPress={() => router.replace('/health/medications')}
          />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen
      title={medication.name}
      subtitle={
        medication.started_on ? `Started ${formatDate(medication.started_on)}` : 'Personal list'
      }
      headerRight={
        <IconBadge
          icon={medication.active ? 'medical' : 'pause'}
          tint={medication.active ? 'violet' : 'slate'}
          size={44}
        />
      }>
      <Card style={styles.summaryCard}>
        <View style={styles.chipRow}>
          <Chip
            label={medication.active ? 'Active' : 'Paused'}
            tint={medication.active ? 'green' : 'slate'}
          />
          <Chip
            label={reminderSummary(medication.reminder_enabled, medication.reminder_times)}
            tint={medication.reminder_enabled ? 'amber' : 'slate'}
            icon="alarm"
          />
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          For your records only. HealthShield does not give dosing advice.
        </ThemedText>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="medical" tint="violet" size={34} />
          <ThemedText type="section">Basics</ThemedText>
        </View>
        <TextField label="Name" icon="medical" value={name} onChangeText={setName} />
        <TextField label="Dose" icon="flask" value={dose} onChangeText={setDose} />
        <TextField
          label="How you take it"
          icon="document-text"
          value={instructions}
          onChangeText={setInstructions}
        />
        <DateField
          label="Started on"
          value={startedOn}
          onChange={setStartedOn}
          maximumDate={new Date()}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <ThemedText type="smallBold">Active on my list</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Pause to keep history without daily reminders.
            </ThemedText>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            disabled={saving}
            trackColor={{ true: theme.primaryMuted, false: theme.border }}
            thumbColor={active ? theme.primary : theme.textTertiary}
          />
        </View>
        <TextField
          label="Notes"
          icon="create"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="alarm" tint="amber" size={34} />
          <ThemedText type="section">Daily reminders</ThemedText>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <ThemedText type="smallBold">Remind me on this device</ThemedText>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            disabled={saving}
            trackColor={{ true: theme.primaryMuted, false: theme.border }}
            thumbColor={reminderEnabled ? theme.primary : theme.textTertiary}
          />
        </View>
        {reminderEnabled ? (
          <>
            <TextField
              label="Time 1 (HH:mm)"
              icon="time"
              value={time1}
              onChangeText={setTime1}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Time 2 (optional)"
              icon="time"
              value={time2}
              onChangeText={setTime2}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Time 3 (optional)"
              icon="time"
              value={time3}
              onChangeText={setTime3}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        ) : null}
      </Card>

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : null}
      {status ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.noticeText}>
            {status}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Save changes" icon="checkmark" loading={saving} onPress={onSave} />
      <Button label="Remove medication" variant="danger" onPress={onDelete} disabled={saving} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  formCard: {
    gap: Spacing.three,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
