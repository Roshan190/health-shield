import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectChip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { toISODate } from '@/lib/dates';
import { safeBack } from '@/lib/navigation/safe-back';
import { getSupabase } from '@/lib/supabase/client';
import type { VitalType } from '@/lib/supabase/database.types';
import {
  combineLocalDateTime,
  defaultUnit,
  nowLocalTimeHHMM,
  VITAL_TYPES,
  vitalTypeMeta,
} from '@/lib/vitals/format';

const baseSchema = z.object({
  vital_type: z.enum(['blood_pressure', 'blood_sugar', 'weight']),
  recorded_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date'),
  recorded_time: z
    .string()
    .trim()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use time as HH:mm'),
  value_primary: z.string().trim().min(1, 'Value is required'),
  value_secondary: z.string().trim(),
  notes: z.string().trim(),
});

function parsePositiveNumber(raw: string, label: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false as const, message: `${label} must be a positive number` };
  }
  return { ok: true as const, value: n };
}

export default function NewVitalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [vitalType, setVitalType] = useState<VitalType>('blood_pressure');
  const [recordedDate, setRecordedDate] = useState(() => toISODate(new Date()));
  const [recordedTime, setRecordedTime] = useState(() => nowLocalTimeHHMM());
  const [valuePrimary, setValuePrimary] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = useMemo(() => vitalTypeMeta(vitalType), [vitalType]);

  async function onSave() {
    if (!user) {
      setError('Not signed in');
      return;
    }

    setError(null);
    const parsed = baseSchema.safeParse({
      vital_type: vitalType,
      recorded_date: recordedDate,
      recorded_time: recordedTime,
      value_primary: valuePrimary,
      value_secondary: valueSecondary,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    const primary = parsePositiveNumber(
      parsed.data.value_primary,
      vitalType === 'blood_pressure' ? 'Systolic' : 'Value'
    );
    if (!primary.ok) {
      setError(primary.message);
      return;
    }

    let secondary: number | null = null;
    if (vitalType === 'blood_pressure') {
      const diastolic = parsePositiveNumber(parsed.data.value_secondary, 'Diastolic');
      if (!diastolic.ok) {
        setError(diastolic.message);
        return;
      }
      if (primary.value <= diastolic.value) {
        setError('Systolic should be higher than diastolic');
        return;
      }
      secondary = diastolic.value;
    }

    const recordedAt = combineLocalDateTime(parsed.data.recorded_date, parsed.data.recorded_time);
    if (!recordedAt) {
      setError('Could not combine date and time');
      return;
    }

    setSaving(true);
    try {
      const { data: created, error: insertError } = await getSupabase()
        .from('vitals')
        .insert({
          user_id: user.id,
          vital_type: vitalType,
          recorded_at: recordedAt,
          value_primary: primary.value,
          value_secondary: secondary,
          unit: defaultUnit(vitalType),
          notes: parsed.data.notes || null,
        })
        .select('*')
        .single();

      if (insertError || !created) {
        throw insertError ?? new Error('Could not save reading');
      }

      router.replace(`/health/vitals/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Log vital"
      subtitle="For your records only — not medical advice."
      headerRight={<IconBadge icon={meta.icon} tint={meta.tint} size={44} />}>
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="pulse" tint="teal" size={34} />
          <ThemedText type="section">Type</ThemedText>
        </View>
        <View style={styles.chips}>
          {VITAL_TYPES.map((item) => (
            <SelectChip
              key={item.value}
              label={item.label}
              selected={vitalType === item.value}
              onPress={() => {
                setVitalType(item.value);
                setValuePrimary('');
                setValueSecondary('');
              }}
              disabled={saving}
            />
          ))}
        </View>
        <ThemedText type="caption" themeColor="textTertiary">
          {meta.hint}
        </ThemedText>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="create" tint="blue" size={34} />
          <ThemedText type="section">Reading</ThemedText>
        </View>
        {vitalType === 'blood_pressure' ? (
          <View style={styles.bpRow}>
            <View style={styles.bpField}>
              <TextField
                label="Systolic *"
                icon="arrow-up"
                placeholder="120"
                value={valuePrimary}
                onChangeText={setValuePrimary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.bpField}>
              <TextField
                label="Diastolic *"
                icon="arrow-down"
                placeholder="80"
                value={valueSecondary}
                onChangeText={setValueSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        ) : (
          <TextField
            label={`${meta.label} (${meta.unit}) *`}
            icon={meta.icon}
            placeholder={vitalType === 'weight' ? '72.5' : '110'}
            value={valuePrimary}
            onChangeText={setValuePrimary}
            keyboardType="decimal-pad"
          />
        )}
        <DateField
          label="Date *"
          value={recordedDate}
          onChange={setRecordedDate}
          maximumDate={new Date()}
          clearable={false}
        />
        <TextField
          label="Time (HH:mm) *"
          icon="time"
          placeholder="09:30"
          value={recordedTime}
          onChangeText={setRecordedTime}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Notes"
          icon="document-text"
          placeholder={
            vitalType === 'blood_sugar' ? 'e.g. Fasting / 2h after meal' : 'Optional context'
          }
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
        />
      </Card>

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Save reading" icon="checkmark" loading={saving} onPress={onSave} />
      <Button
        label="Cancel"
        variant="ghost"
        onPress={() => safeBack(router, '/health/vitals')}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bpRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bpField: {
    flex: 1,
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
