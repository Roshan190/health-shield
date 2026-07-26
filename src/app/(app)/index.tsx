import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, PressableCard } from '@/components/card';
import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { SectionHeader } from '@/components/section-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Overlay,
  Radius,
  Shadow,
  Spacing,
  type TintName,
} from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { findNextDose, nextDoseLabel } from '@/lib/medications/next-dose';
import { syncMedicationNotifications } from '@/lib/notifications/medications';
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
import type { Medication, Policy, Vital } from '@/lib/supabase/database.types';
import { formatVitalValue, formatVitalWhen, vitalTypeLabel } from '@/lib/vitals/format';
import { vitalVisual } from '@/lib/vitals/visuals';

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
  route?: string;
  soon?: string;
};

/** Thin Home CTAs only — full feature map lives in tabs / Health hub (D-012). */
const QUICK_ACTIONS: QuickAction[] = [
  { key: 'health', label: 'Health', icon: 'fitness', tint: 'teal', route: '/health' },
  { key: 'add-policy', label: 'Add policy', icon: 'add-circle', tint: 'blue', route: '/policies/new' },
  { key: 'emergency', label: 'Emergency', icon: 'medkit', tint: 'red', route: '/profile/emergency' },
];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [recentVitals, setRecentVitals] = useState<Vital[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const supabase = getSupabase();
        const [policiesRes, profileRes, vitalsRes, medsRes] = await Promise.all([
          supabase
            .from('policies')
            .select('*')
            .order('renewal_date', { ascending: true, nullsFirst: false }),
          user
            ? supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('vitals')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(3),
          supabase.from('medications').select('*').order('updated_at', { ascending: false }),
        ]);
        if (!active) {
          return;
        }
        const nextPolicies = policiesRes.data ?? [];
        const nextMeds = medsRes.data ?? [];
        setPolicies(nextPolicies);
        setRecentVitals(vitalsRes.data ?? []);
        setMedications(nextMeds);
        const fullName = profileRes.data?.full_name ?? null;
        setFirstName(fullName ? fullName.trim().split(/\s+/)[0] : null);
        setLoading(false);
        void syncRenewalNotifications(nextPolicies);
        void syncMedicationNotifications(nextMeds);
      })();
      return () => {
        active = false;
      };
    }, [user])
  );

  const stats = useMemo(() => {
    const totalCover = policies.reduce((sum, p) => sum + (p.sum_insured ?? 0), 0);
    const dueSoon = policies.filter((p) => isRenewalSoon(p.renewal_date, 60)).length;
    return { count: policies.length, totalCover, dueSoon };
  }, [policies]);

  const upcoming = useMemo(
    () => policies.filter((p) => isRenewalSoon(p.renewal_date, 60)).slice(0, 4),
    [policies]
  );

  const nextDose = useMemo(() => findNextDose(medications), [medications]);

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + Spacing.four }]}
        showsVerticalScrollIndicator={false}>
        {/* ——— Hero banner ——— */}
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroGreeting}>
                <ThemedText type="small" style={styles.heroKicker}>
                  {greetingForNow()}
                </ThemedText>
                <ThemedText type="title" style={styles.heroTitle}>
                  {firstName ?? 'Welcome'}
                </ThemedText>
                <ThemedText type="small" style={styles.heroSub}>
                  Your family’s health &amp; insurance, organized.
                </ThemedText>
              </View>
              <View style={styles.heroMark}>
                <Ionicons name="shield-checkmark" size={30} color={Overlay.onGradient} />
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* ——— Portfolio stats, overlapping the hero ——— */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.statsRow}>
            <StatTile
              label="Policies"
              value={loading ? null : String(stats.count)}
              icon="shield-checkmark"
              tint="blue"
            />
            <StatTile
              label="Total cover"
              value={loading ? null : formatInrCompact(stats.totalCover || null)}
              icon="wallet"
              tint="teal"
            />
            <StatTile
              label="Due in 60d"
              value={loading ? null : String(stats.dueSoon)}
              icon="alarm"
              tint={stats.dueSoon > 0 ? 'amber' : 'green'}
            />
          </Animated.View>

          {/* ——— Quick actions ——— */}
          <SectionHeader title="Quick actions" />
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <Animated.View
                key={action.key}
                entering={FadeInDown.duration(400).delay(60 * index)}
                style={styles.actionCell}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!action.route}
                  onPress={() => action.route && router.push(action.route as never)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    Shadow.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: action.route ? 1 : 0.75,
                    },
                  ]}>
                  <IconBadge icon={action.icon} tint={action.tint} size={46} />
                  <ThemedText type="smallBold">{action.label}</ThemedText>
                  {action.soon ? <Chip label={action.soon} tint="slate" /> : null}
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* ——— Health snapshot (slice 2.5) ——— */}
          <SectionHeader
            title="Health snapshot"
            actionLabel="Open Health"
            onAction={() => router.push('/health')}
          />
          <View style={styles.healthRow}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.healthCell}>
              {loading ? (
                <Card style={styles.healthCard}>
                  <Skeleton width={40} height={40} />
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="90%" height={12} />
                </Card>
              ) : nextDose ? (
                <PressableCard
                  style={styles.healthCard}
                  onPress={() => router.push(`/health/medications/${nextDose.medication.id}`)}>
                  <IconBadge icon="medical" tint="violet" size={40} />
                  <ThemedText type="caption" themeColor="textSecondary">
                    Next medication
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {nextDose.medication.name}
                  </ThemedText>
                  <Chip
                    label={nextDoseLabel(nextDose)}
                    tint="amber"
                    icon="alarm"
                  />
                  {nextDose.medication.dose ? (
                    <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
                      {nextDose.medication.dose}
                    </ThemedText>
                  ) : null}
                </PressableCard>
              ) : (
                <PressableCard
                  style={styles.healthCard}
                  onPress={() => router.push('/health/medications/new')}>
                  <IconBadge icon="medical" tint="violet" size={40} />
                  <ThemedText type="smallBold">Medications</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Add a med with a reminder to see your next dose here.
                  </ThemedText>
                  <Chip label="Add medication" tint="violet" icon="add" />
                </PressableCard>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.healthCell}>
              {loading ? (
                <Card style={styles.healthCard}>
                  <Skeleton width={40} height={40} />
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="90%" height={12} />
                </Card>
              ) : recentVitals.length > 0 ? (
                <PressableCard
                  style={styles.healthCard}
                  onPress={() => router.push('/health/vitals')}>
                  <IconBadge
                    icon={vitalVisual(recentVitals[0].vital_type).icon}
                    tint={vitalVisual(recentVitals[0].vital_type).tint}
                    size={40}
                  />
                  <ThemedText type="caption" themeColor="textSecondary">
                    Recent vital
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {vitalTypeLabel(recentVitals[0].vital_type)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {formatVitalValue(
                      recentVitals[0].vital_type,
                      recentVitals[0].value_primary,
                      recentVitals[0].value_secondary,
                      recentVitals[0].unit
                    )}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
                    {formatVitalWhen(recentVitals[0].recorded_at)}
                  </ThemedText>
                  {recentVitals.length > 1 ? (
                    <Chip
                      label={`+${recentVitals.length - 1} more`}
                      tint="slate"
                      icon="pulse"
                    />
                  ) : null}
                </PressableCard>
              ) : (
                <PressableCard
                  style={styles.healthCard}
                  onPress={() => router.push('/health/vitals/new')}>
                  <IconBadge icon="heart" tint="red" size={40} />
                  <ThemedText type="smallBold">Vitals</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Log blood pressure, sugar, or weight to track trends.
                  </ThemedText>
                  <Chip label="Log a reading" tint="teal" icon="add" />
                </PressableCard>
              )}
            </Animated.View>
          </View>

          {/* ——— Upcoming renewals ——— */}
          <SectionHeader
            title="Upcoming renewals"
            actionLabel={policies.length > 0 ? 'View all' : undefined}
            onAction={policies.length > 0 ? () => router.push('/policies') : undefined}
          />

          {loading ? (
            <Card>
              <Skeleton width="60%" height={15} />
              <Skeleton width="85%" height={13} />
              <Skeleton width="45%" height={13} />
            </Card>
          ) : upcoming.length === 0 ? (
            <Card style={styles.allClear}>
              <IconBadge icon="checkmark-done-circle" tint="green" size={46} shape="circle" />
              <View style={styles.allClearBody}>
                <ThemedText type="smallBold">All caught up</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing renews in the next 60 days. Add a policy with a renewal date to track it
                  here.
                </ThemedText>
              </View>
            </Card>
          ) : (
            <View style={styles.renewalList}>
              {upcoming.map((policy, index) => {
                const visual = policyVisual(policy.policy_type);
                const tone = renewalTone(policy.renewal_date);
                return (
                  <Animated.View
                    key={policy.id}
                    entering={FadeInDown.duration(400).delay(60 * index)}>
                    <PressableCard
                      style={styles.renewalCard}
                      onPress={() => router.push(`/policies/${policy.id}`)}>
                      <IconBadge icon={visual.icon} tint={visual.tint} size={46} />
                      <View style={styles.renewalBody}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {policy.insurer}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {policyTypeLabel(policy.policy_type)} ·{' '}
                          {formatInrCompact(policy.sum_insured)} cover
                        </ThemedText>
                        <Chip
                          label={renewalLabel(policy.renewal_date)}
                          tint={RENEWAL_TONE_TINT[tone]}
                          icon={tone === 'muted' ? 'calendar' : 'alarm'}
                        />
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                    </PressableCard>
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* ——— Trust strip ——— */}
          <Card variant="muted" style={styles.trustCard}>
            <IconBadge icon="lock-closed" tint="slate" size={40} shape="circle" />
            <View style={styles.trustBody}>
              <ThemedText type="smallBold">Private by design</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Documents are stored in private, access-controlled storage. Only you can see your
                data.
              </ThemedText>
            </View>
          </Card>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function StatTile({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  tint: TintName;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.statTile,
        Shadow.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      <IconBadge icon={icon} tint={tint} size={32} />
      {value == null ? (
        <Skeleton width={44} height={22} />
      ) : (
        <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </ThemedText>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingBottom: Spacing.six - Spacing.two,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.two,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heroGreeting: {
    flex: 1,
    gap: Spacing.one,
  },
  heroKicker: {
    color: Overlay.onGradientFaint,
    fontWeight: 600,
  },
  heroTitle: {
    color: Overlay.onGradient,
  },
  heroSub: {
    color: Overlay.onGradientMuted,
  },
  heroMark: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlay.glassBg,
    borderWidth: 1,
    borderColor: Overlay.glassBorder,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.three,
    marginTop: -Spacing.five,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.half,
  },
  statTile: {
    flex: 1,
    gap: Spacing.one + Spacing.half,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.half,
  },
  actionCell: {
    flex: 1,
    minWidth: 0,
  },
  actionCard: {
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 108,
  },
  healthRow: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.half,
  },
  healthCell: {
    flex: 1,
    minWidth: 0,
  },
  healthCard: {
    alignItems: 'flex-start',
    gap: Spacing.one + Spacing.half,
    minHeight: 168,
  },
  renewalList: {
    gap: Spacing.two + Spacing.half,
  },
  renewalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  renewalBody: {
    flex: 1,
    gap: Spacing.one,
  },
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  allClearBody: {
    flex: 1,
    gap: Spacing.half,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  trustBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
