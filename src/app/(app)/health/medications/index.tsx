import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { ReminderStatusCard } from '@/components/reminder-status-card';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { reminderSummary } from '@/lib/medications/format';
import { syncMedicationNotifications } from '@/lib/notifications/medications';
import { getSupabase } from '@/lib/supabase/client';
import type { Medication } from '@/lib/supabase/database.types';

export default function MedicationsListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getSupabase()
      .from('medications')
      .select('*')
      .order('name', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setMedications([]);
    } else {
      const rows = data ?? [];
      setMedications(rows);
      void syncMedicationNotifications(rows);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen
      title="Medications"
      subtitle="Your list and local dose reminders."
      headerRight={
        !loading && medications.length > 0 ? (
          <Button
            label="Add"
            icon="add"
            size="sm"
            onPress={() => router.push('/health/medications/new')}
          />
        ) : undefined
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : medications.length === 0 ? (
        <EmptyState
          icon="medical"
          tint="violet"
          accessories={['alarm', 'fitness']}
          title="Add a medication"
          message="Name, dose, and optional daily reminders on this device. Not a pharmacy — just your personal list.">
          <Button
            label="Add medication"
            icon="add"
            onPress={() => router.push('/health/medications/new')}
          />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          <ReminderStatusCard
            detail="Dose reminders stay on this device and are not synced across phones."
            hideWhenGranted
          />

          {medications.map((med, index) => (
            <Animated.View key={med.id} entering={FadeInDown.delay(index * 40).springify()}>
              <PressableCard
                style={styles.medCard}
                onPress={() => router.push(`/health/medications/${med.id}`)}>
                <IconBadge
                  icon={med.active ? 'medical' : 'pause'}
                  tint={med.active ? 'violet' : 'slate'}
                  size={46}
                />
                <View style={styles.medBody}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {med.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {[med.dose, med.instructions].filter(Boolean).join(' · ') || 'No dose details'}
                  </ThemedText>
                  <View style={styles.chipRow}>
                    <Chip
                      label={med.active ? 'Active' : 'Paused'}
                      tint={med.active ? 'green' : 'slate'}
                      icon={med.active ? 'checkmark-circle' : 'pause-circle'}
                    />
                    <Chip
                      label={reminderSummary(med.reminder_enabled, med.reminder_times)}
                      tint={med.reminder_enabled ? 'amber' : 'slate'}
                      icon="alarm"
                    />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
              </PressableCard>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  medBody: {
    flex: 1,
    gap: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.half,
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
