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
import { ReminderStatusCard } from '@/components/reminder-status-card';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { syncRenewalNotifications } from '@/lib/notifications/renewals';
import {
  formatInrCompact,
  isRenewalSoon,
  policyTypeLabel,
  renewalLabel,
  renewalTone,
} from '@/lib/policies/format';
import { policyVisual, RENEWAL_TONE_TINT } from '@/lib/policies/visuals';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember, Policy } from '@/lib/supabase/database.types';

export default function PoliciesListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    for (const member of members) {
      map.set(member.id, member);
    }
    return map;
  }, [members]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [policiesRes, membersRes] = await Promise.all([
      getSupabase()
        .from('policies')
        .select('*')
        .order('renewal_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
    ]);

    if (policiesRes.error) {
      setError(policiesRes.error.message);
      setPolicies([]);
    } else {
      const rows = policiesRes.data ?? [];
      setPolicies(rows);
      const owned = user ? rows.filter((p) => p.user_id === user.id) : rows;
      void syncRenewalNotifications(owned);
    }
    setMembers(membersRes.data ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = useMemo(() => {
    const totalCover = policies.reduce((sum, p) => sum + (p.sum_insured ?? 0), 0);
    const dueSoon = policies.filter((p) => isRenewalSoon(p.renewal_date, 60)).length;
    const withRenewal = policies.some((p) => Boolean(p.renewal_date));
    return { totalCover, dueSoon, withRenewal };
  }, [policies]);

  return (
    <Screen
      title="Policies"
      subtitle="Your household's insurance portfolio."
      headerRight={
        <View style={styles.headerActions}>
          <Button
            label="Claims"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/claims' as Href)}
          />
          {!loading && policies.length > 0 ? (
            <Button
              label="Add"
              icon="add"
              size="sm"
              onPress={() => router.push('/policies/new')}
            />
          ) : null}
        </View>
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline"
          tint="red"
          title="Couldn't load policies"
          message={error}>
          <Button label="Try again" icon="refresh" onPress={load} />
        </EmptyState>
      ) : policies.length === 0 ? (
        <EmptyState
          icon="shield-checkmark"
          tint="blue"
          accessories={['document-text', 'alarm']}
          title="Protect what matters"
          message="Add your first policy to track cover, renewal dates, and keep the PDF safe — all in one place.">
          <Button
            label="Add your first policy"
            icon="add-circle"
            onPress={() => router.push('/policies/new')}
          />
        </EmptyState>
      ) : (
        <>
          {/* Portfolio summary strip */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <ThemedText type="label" themeColor="textTertiary">
                Policies
              </ThemedText>
              <ThemedText type="stat">{policies.length}</ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="label" themeColor="textTertiary">
                Total cover
              </ThemedText>
              <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
                {formatInrCompact(summary.totalCover || null)}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="label" themeColor="textTertiary">
                Due in 60d
              </ThemedText>
              <ThemedText
                type="stat"
                style={summary.dueSoon > 0 ? { color: theme.warning } : undefined}>
                {summary.dueSoon}
              </ThemedText>
            </View>
          </Card>

          {summary.withRenewal ? (
            <ReminderStatusCard
              detail="Renewal alerts fire 30 days, 7 days, and on the renewal date (local, 9:00)."
              hideWhenGranted
            />
          ) : null}

          <View style={styles.list}>
            {policies.map((policy, index) => {
              const visual = policyVisual(policy.policy_type);
              const tone = renewalTone(policy.renewal_date);
              const memberName = policy.family_member_id
                ? memberById.get(policy.family_member_id)?.full_name
                : null;
              const isShared = Boolean(user && policy.user_id !== user.id);
              return (
                <Animated.View
                  key={policy.id}
                  entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 50)}>
                  <PressableCard
                    style={styles.policyCard}
                    onPress={() => router.push(`/policies/${policy.id}`)}>
                    <IconBadge icon={visual.icon} tint={visual.tint} size={48} />
                    <View style={styles.policyBody}>
                      <View style={styles.policyTopRow}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.insurer}>
                          {policy.insurer}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textTertiary">
                          {policyTypeLabel(policy.policy_type)}
                        </ThemedText>
                      </View>
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        № {policy.policy_number}
                        {memberName ? ` · ${memberName}` : ''}
                      </ThemedText>
                      <View style={styles.policyBottomRow}>
                        <ThemedText type="smallBold">
                          {formatInrCompact(policy.sum_insured)}{' '}
                          <ThemedText type="caption" themeColor="textTertiary">
                            cover
                          </ThemedText>
                        </ThemedText>
                        <View style={styles.chipRow}>
                          {isShared ? <Chip label="Shared" tint="teal" icon="eye" /> : null}
                          <Chip
                            label={renewalLabel(policy.renewal_date)}
                            tint={RENEWAL_TONE_TINT[tone]}
                            icon={tone === 'muted' ? 'calendar' : 'alarm'}
                          />
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                  </PressableCard>
                </Animated.View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  summaryItem: {
    flex: 1,
    gap: Spacing.one,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.three,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  policyBody: {
    flex: 1,
    gap: Spacing.one,
  },
  policyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  insurer: {
    flex: 1,
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  policyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    justifyContent: 'flex-end',
  },
});
