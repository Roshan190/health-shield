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

export default function FamilyListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getSupabase()
      .from('family_members')
      .select('*')
      .order('full_name', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setMembers([]);
    } else {
      setMembers(data ?? []);
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
      title="Family"
      subtitle="Household profiles you manage."
      headerRight={
        !loading && members.length > 0 ? (
          <Button label="Add" icon="add" size="sm" onPress={() => router.push('/family/new')} />
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
      ) : members.length === 0 ? (
        <EmptyState
          icon="people"
          tint="amber"
          accessories={['heart', 'shield-checkmark']}
          title="Add your household"
          message="Spouse, children, parents — keep their basics here. Policies and records stay private to you until sharing ships.">
          <Button label="Add family member" icon="person-add" onPress={() => router.push('/family/new')} />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          <Card variant="tinted" style={styles.defaultsCard}>
            <IconBadge icon="lock-closed" tint="slate" size={40} />
            <View style={styles.defaultsBody}>
              <ThemedText type="smallBold">Shared vs private</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Policies and medical records stay private to your account by default. Roles
                (viewer / manager) are saved for when invites arrive — they do not grant access yet.
              </ThemedText>
            </View>
          </Card>

          {members.map((member, index) => {
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
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
