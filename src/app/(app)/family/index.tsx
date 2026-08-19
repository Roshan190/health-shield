import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { relationshipLabel, roleLabel } from '@/lib/family/format';
import { memberVisual, roleTint } from '@/lib/family/visuals';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember } from '@/lib/supabase/database.types';

type LinkCounts = Record<string, { policies: number; records: number }>;

export default function FamilyListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [linkCounts, setLinkCounts] = useState<LinkCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [membersRes, policiesRes, recordsRes] = await Promise.all([
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
      getSupabase().from('policies').select('family_member_id'),
      getSupabase().from('medical_records').select('family_member_id'),
    ]);

    if (membersRes.error) {
      setError(membersRes.error.message);
      setMembers([]);
      setLinkCounts({});
    } else {
      setMembers(membersRes.data ?? []);
      const counts: LinkCounts = {};
      for (const row of policiesRes.data ?? []) {
        if (!row.family_member_id) {
          continue;
        }
        counts[row.family_member_id] ??= { policies: 0, records: 0 };
        counts[row.family_member_id].policies += 1;
      }
      for (const row of recordsRes.data ?? []) {
        if (!row.family_member_id) {
          continue;
        }
        counts[row.family_member_id] ??= { policies: 0, records: 0 };
        counts[row.family_member_id].records += 1;
      }
      setLinkCounts(counts);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const memberCards = useMemo(
    () =>
      members.map((member) => {
        const counts = linkCounts[member.id];
        const total = (counts?.policies ?? 0) + (counts?.records ?? 0);
        return { member, total, counts };
      }),
    [members, linkCounts]
  );

  return (
    <Screen
      title="Family"
      subtitle="Profiles you manage · sharing for logins"
      headerRight={
        <View style={styles.headerActions}>
          <Button
            label="Sharing"
            icon="share-social"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/family/sharing')}
          />
          {!loading && members.length > 0 ? (
            <Button label="Add" icon="add" size="sm" onPress={() => router.push('/family/new')} />
          ) : null}
        </View>
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline" tint="red" title="Couldn't load family" message={error}>
          <Button label="Try again" icon="refresh" onPress={load} />
        </EmptyState>
      ) : members.length === 0 ? (
        <EmptyState
          icon="people"
          tint="amber"
          accessories={['heart', 'shield-checkmark']}
          title="Add your household"
          message="Spouse, children, parents — keep their basics here. To let Mom see items on her own login, use Sharing (invite by email).">
          <Button
            label="Add family member"
            icon="person-add"
            onPress={() => router.push('/family/new')}
          />
          <Button
            label="Open sharing"
            icon="share-social"
            variant="secondary"
            onPress={() => router.push('/family/sharing')}
          />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          <Card variant="tinted" style={styles.defaultsCard}>
            <IconBadge icon="lock-closed" tint="slate" size={40} />
            <View style={styles.defaultsBody}>
              <ThemedText type="smallBold">Profiles vs logins</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Family members here are profiles on your account. To share with someone's own
                login, use Sharing: invite → they accept → share specific policies or records.
              </ThemedText>
            </View>
          </Card>

          {memberCards.map(({ member, total, counts }, index) => {
            const visual = memberVisual(member.relationship);
            return (
              <Animated.View key={member.id} entering={FadeInDown.delay(index * 40).springify()}>
                <PressableCard
                  style={styles.memberCard}
                  onPress={() => router.push(`/family/${member.id}`)}>
                  <IconBadge icon={visual.icon} tint={visual.tint} size={46} />
                  <View style={styles.memberBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {member.full_name}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {relationshipLabel(member.relationship)}
                      {member.date_of_birth ? ` · Born ${formatDate(member.date_of_birth)}` : ''}
                      {member.blood_group ? ` · ${member.blood_group}` : ''}
                    </ThemedText>
                    <View style={styles.chipRow}>
                      <Chip
                        label={roleLabel(member.role)}
                        tint={roleTint(member.role)}
                        icon={member.role === 'manager' ? 'key' : 'eye'}
                      />
                      {total > 0 ? (
                        <Chip
                          label={`${counts?.policies ?? 0} pol · ${counts?.records ?? 0} rec`}
                          tint="teal"
                          icon="link"
                        />
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                </PressableCard>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  defaultsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  defaultsBody: {
    flex: 1,
    gap: Spacing.half,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  memberBody: {
    flex: 1,
    gap: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
});
