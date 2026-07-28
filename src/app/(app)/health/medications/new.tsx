import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { isValidReminderTime, normalizeReminderTimes } from '@/lib/medications/format';
import { safeBack } from '@/lib/navigation/safe-back';
import { syncMedicationNotifications } from '@/lib/notifications/medications';
import { getSupabase } from '@/lib/supabase/client';

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
  time1: z.string().trim(),
  time2: z.string().trim(),
  time3: z.string().trim(),
});

export default function NewMedicationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startedOn, setStartedOn] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [time1, setTime1] = useState('09:00');
  const [time2, setTime2] = useState('');
  const [time3, setTime3] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!user) {
      setError('Not signed in');
      return;
    }

    setError(null);
    const parsed = schema.safeParse({
      name,
      dose,
      instructions,
      started_on: startedOn,
      notes,
      reminder_enabled: reminderEnabled,
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
    try {
      const { data: created, error: insertError } = await getSupabase()
        .from('medications')
        .insert({
          user_id: user.id,
          name: parsed.data.name,
          dose: parsed.data.dose || null,
          instructions: parsed.data.instructions || null,
          started_on: parsed.data.started_on || null,
          notes: parsed.data.notes || null,
          reminder_enabled: parsed.data.reminder_enabled,
          reminder_times: reminderTimes,
          active: true,
        })
        .select('*')
        .single();

      if (insertError || !created) {
        throw insertError ?? new Error('Could not save medication');
      }

      const { data: all } = await getSupabase()
        .from('medications')
        .select('*')
        .order('name', { ascending: true });
      void syncMedicationNotifications(all ?? [created]);

      router.replace(`/health/medications/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Add medication"
      subtitle="Personal list only — not a prescription service."
      headerRight={<IconBadge icon="medical" tint="violet" size={44} />}>
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="medical" tint="violet" size={34} />
          <ThemedText type="section">Basics</ThemedText>
        </View>
        <TextField
          label="Name *"
          icon="medical"
          placeholder="e.g. Metformin"
          value={name}
          onChangeText={setName}
        />
        <TextField
          label="Dose"
          icon="flask"
          placeholder="e.g. 500 mg"
          value={dose}
          onChangeText={setDose}
        />
        <TextField
          label="How you take it"
          icon="document-text"
          placeholder="e.g. After breakfast"
          value={instructions}
          onChangeText={setInstructions}
        />
        <DateField
          label="Started on"
          value={startedOn}
          onChange={setStartedOn}
          maximumDate={new Date()}
          hint="Optional"
        />
        <TextField
          label="Notes"
          icon="create"
          placeholder="Anything useful"
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
            <ThemedText type="caption" themeColor="textSecondary">
              Local notifications only. Not synced across phones.
            </ThemedText>
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
              label="Time 1 (HH:mm) *"
              icon="time"
              placeholder="09:00"
              value={time1}
              onChangeText={setTime1}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Time 2 (optional)"
              icon="time"
              placeholder="21:00"
              value={time2}
              onChangeText={setTime2}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Time 3 (optional)"
              icon="time"
              placeholder="14:00"
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

      <Button label="Save medication" icon="checkmark" loading={saving} onPress={onSave} />
      <Button
        label="Cancel"
        variant="ghost"
        onPress={() => safeBack(router, '/health/medications')}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
