import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/policies/format';
import {
  VISIT_DISCLAIMER,
  doctorPortalUrl,
  listVisitConsents,
  visitStatusLabel,
  visitStatusTint,
} from '@/lib/visit/api';
import type { VisitConsent } from '@/lib/supabase/database.types';

export default function VisitListScreen() {
  const router = useRouter();
  const [consents, setConsents] = useState<VisitConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConsents(await listVisitConsents());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load visit packs.');
      setConsents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen
      title="Doctor visit"
      subtitle={VISIT_DISCLAIMER}
      headerRight={
        <Button
          label="New pack"
          icon="add"
          size="sm"
          onPress={() => router.push('/visit/new' as Href)}
        />
      }>
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          tint="red"
          title="Could not load visit packs"
          message={error}>
          <Button label="Retry" icon="refresh" variant="secondary" onPress={() => void load()} />
        </EmptyState>
      ) : consents.length === 0 ? (
        <EmptyState
          icon="medkit"
          tint="teal"
          accessories={['document-text', 'time']}
          title="No visit packs yet"
          message="Pick policies and records for a clinic visit. The doctor signs in on the web with the email you enter — only until the time you set.">
          <Button label="Create a visit pack" icon="add" onPress={() => router.push('/visit/new' as Href)} />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          {consents.map((consent, index) => (
            <Animated.View key={consent.id} entering={FadeInDown.delay(index * 40)}>
              <PressableCard onPress={() => router.push(`/visit/${consent.id}` as Href)}>
                <View style={styles.row}>
                  <IconBadge icon="medkit" tint="teal" size={40} />
                  <View style={styles.grow}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {consent.doctor_email}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Expires {formatDate(consent.expires_at.slice(0, 10))}
                    </ThemedText>
                  </View>
                  <Chip label={visitStatusLabel(consent)} tint={visitStatusTint(consent)} />
                </View>
              </PressableCard>
            </Animated.View>
          ))}
        </View>
      )}

      <Card variant="muted">
        <ThemedText type="caption" themeColor="textSecondary">
          Doctor website: {doctorPortalUrl()}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.gap}>
          This is not family sharing. Household members use Family → Sharing.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  gap: {
    marginTop: Spacing.one,
  },
});
