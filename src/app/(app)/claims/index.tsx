import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  CLAIM_DISCLAIMER,
  claimStatusLabel,
  claimStatusTint,
} from '@/lib/claims/api';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type { Claim, ClaimChecklistItem, Policy } from '@/lib/supabase/database.types';

export default function ClaimsListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [items, setItems] = useState<ClaimChecklistItem[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const [claimsRes, itemsRes, policiesRes] = await Promise.all([
      supabase.from('claims').select('*').order('created_at', { ascending: false }),
      supabase.from('claim_checklist_items').select('*'),
      supabase.from('policies').select('*').order('created_at', { ascending: false }),
    ]);

    if (claimsRes.error) {
      setError(claimsRes.error.message);
      setClaims([]);
    } else {
      setClaims(claimsRes.data ?? []);
    }
    setItems(itemsRes.data ?? []);
    setPolicies(policiesRes.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const policyById = useMemo(() => {
    const map = new Map<string, Policy>();
    for (const policy of policies) {
      map.set(policy.id, policy);
    }
    return map;
  }, [policies]);

  const progressByClaim = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const item of items) {
      const prev = map.get(item.claim_id) ?? { done: 0, total: 0 };
      prev.total += 1;
      if (item.done) {
        prev.done += 1;
      }
      map.set(item.claim_id, prev);
    }
    return map;
  }, [items]);

  const ownedPolicies = useMemo(
    () => (user ? policies.filter((p) => p.user_id === user.id) : policies),
    [policies, user]
  );

  return (
    <Screen
      title="Claims organizer"
      subtitle="Gather documents for a health claim. We do not file with insurers."
      headerRight={
        !loading && ownedPolicies.length > 0 ? (
          <Button
            label="New"
            icon="add"
            size="sm"
            onPress={() => router.push('/claims/new' as Href)}
          />
        ) : undefined
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline"
          tint="red"
          title="Couldn't load claims"
          message={error}>
          <Button label="Try again" icon="refresh" onPress={load} />
        </EmptyState>
      ) : ownedPolicies.length === 0 ? (
        <EmptyState
          icon="shield-checkmark"
          tint="blue"
          accessories={['document-text', 'folder-open']}
          title="Add a policy first"
          message="A claim organizer is tied to a policy you own. Add a health policy, then come back here.">
          <Button
            label="Add a policy"
            icon="add-circle"
            onPress={() => router.push('/policies/new')}
          />
        </EmptyState>
      ) : claims.length === 0 ? (
        <EmptyState
          icon="folder-open"
          tint="amber"
          accessories={['checkbox', 'document-text']}
          title="Organize a claim"
          message="Keep a checklist of typical India health-claim documents. Tick items and link files already in your vault. We do not send anything to the insurer.">
          <Button
            label="Start a claim checklist"
            icon="add-circle"
            onPress={() => router.push('/claims/new' as Href)}
          />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          {claims.map((claim, index) => {
            const policy = policyById.get(claim.policy_id);
            const progress = progressByClaim.get(claim.id) ?? { done: 0, total: 0 };
            return (
              <Animated.View
                key={claim.id}
                entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 50)}>
                <PressableCard
                  style={styles.claimCard}
                  onPress={() => router.push(`/claims/${claim.id}` as Href)}>
                  <IconBadge icon="folder-open" tint="amber" size={48} />
                  <View style={styles.claimBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {policy?.insurer ?? 'Policy'}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {policy ? `№ ${policy.policy_number}` : 'Policy removed'}
                      {claim.hospital_name ? ` · ${claim.hospital_name}` : ''}
                    </ThemedText>
                    <View style={styles.claimMeta}>
                      <Chip
                        label={claimStatusLabel(claim.status)}
                        tint={claimStatusTint(claim.status)}
                      />
                      <ThemedText type="caption" themeColor="textTertiary">
                        {progress.done}/{progress.total} ready · {formatDate(claim.created_at.slice(0, 10))}
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                </PressableCard>
              </Animated.View>
            );
          })}
          <Card variant="muted">
            <ThemedText type="caption" themeColor="textSecondary">
              {CLAIM_DISCLAIMER}
            </ThemedText>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  claimBody: {
    flex: 1,
    gap: Spacing.one,
  },
  claimMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
});
