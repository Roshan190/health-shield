import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, SelectChip } from '@/components/chip';
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
import { getSupabase } from '@/lib/supabase/client';
import type { Vital, VitalType } from '@/lib/supabase/database.types';
import {
  combineLocalDateTime,
  defaultUnit,
  formatVitalValue,
  formatVitalWhen,
  splitLocalDateTime,
  VITAL_TYPES,
  vitalTypeLabel,
  vitalTypeMeta,
} from '@/lib/vitals/format';
import { vitalVisual } from '@/lib/vitals/visuals';

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

export default function VitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [vital, setVital] = useState<Vital | null>(null);
  const [vitalType, setVitalType] = useState<VitalType>('blood_pressure');
  const [recordedDate, setRecordedDate] = useState('');
  const [recordedTime, setRecordedTime] = useState('');
  const [valuePrimary, setValuePrimary] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const meta = useMemo(() => vitalTypeMeta(vitalType), [vitalType]);

  const hydrate = useCallback((row: Vital) => {
    setVital(row);
    setVitalType(row.vital_type);
    const split = splitLocalDateTime(row.recorded_at);
    setRecordedDate(split.date);
    setRecordedTime(split.time);
    setValuePrimary(String(row.value_primary));
    setValueSecondary(row.value_secondary != null ? String(row.value_secondary) : '');
    setNotes(row.notes ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const { data, error: loadError } = await getSupabase()
      .from('vitals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
    } else if (!data) {
      setError('Reading not found');
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

  async function onSave() {
    if (!user || !id) {
      return;
    }
    setError(null);
    setStatus(null);

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
    const { data, error: saveError } = await getSupabase()
      .from('vitals')
      .update({
        vital_type: vitalType,
        recorded_at: recordedAt,
        value_primary: primary.value,
        value_secondary: secondary,
        unit: defaultUnit(vitalType),
        notes: parsed.data.notes || null,
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
    setStatus('Reading updated.');
  }

  function onDelete() {
    if (!id) {
      return;
    }
    Alert.alert('Delete reading?', 'This removes the vital from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await getSupabase().from('vitals').delete().eq('id', id);
          if (deleteError) {
            setError(deleteError.message);
            return;
          }
          router.replace('/health/vitals');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Reading" subtitle="Loading…">
        <Card>
          <Skeleton width="60%" height={22} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      </Screen>
    );
  }

  if (!vital) {
    return (
      <Screen title="Reading" subtitle="Not found">
        <EmptyState
          icon="cloud-offline"
          tint="red"
          title="Couldn't open this reading"
          message={error ?? 'Reading not found'}>
          <Button
            label="Back to vitals"
            variant="secondary"
            onPress={() => router.replace('/health/vitals')}
          />
        </EmptyState>
      </Screen>
    );
  }

  const visual = vitalVisual(vital.vital_type);

  return (
    <Screen
      title={vitalTypeLabel(vital.vital_type)}
      subtitle={formatVitalWhen(vital.recorded_at)}
      headerRight={<IconBadge icon={visual.icon} tint={visual.tint} size={44} />}>
      <Card style={styles.summaryCard}>
        <Chip
          label={formatVitalValue(
            vital.vital_type,
            vital.value_primary,
            vital.value_secondary,
            vital.unit
          )}
          tint={visual.tint}
          icon={visual.icon}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          Personal log only. HealthShield does not interpret readings or diagnose conditions.
        </ThemedText>
      </Card>

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
                if (item.value !== 'blood_pressure') {
                  setValueSecondary('');
                }
              }}
              disabled={saving}
            />
          ))}
        </View>
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
                label="Systolic"
                icon="arrow-up"
                value={valuePrimary}
                onChangeText={setValuePrimary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.bpField}>
              <TextField
                label="Diastolic"
                icon="arrow-down"
                value={valueSecondary}
                onChangeText={setValueSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        ) : (
          <TextField
            label={`${meta.label} (${meta.unit})`}
            icon={meta.icon}
            value={valuePrimary}
            onChangeText={setValuePrimary}
            keyboardType="decimal-pad"
          />
        )}
        <DateField
          label="Date"
          value={recordedDate}
          onChange={setRecordedDate}
          maximumDate={new Date()}
          clearable={false}
        />
        <TextField
          label="Time (HH:mm)"
          icon="time"
          value={recordedTime}
          onChangeText={setRecordedTime}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Notes"
          icon="document-text"
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
      {status ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.noticeText}>
            {status}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Save changes" icon="checkmark" loading={saving} onPress={onSave} />
      <Button label="Delete reading" variant="danger" onPress={onDelete} disabled={saving} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: Spacing.two,
  },
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
