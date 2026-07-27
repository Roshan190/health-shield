import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { PressableCard } from '@/components/card';
import { Chip, SelectChip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  matchesRecordQuery,
  RECORD_CATEGORIES,
  recordCategoryLabel,
  recordTimelineGroup,
  recordVisual,
} from '@/lib/records/format';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember, MedicalRecord, RecordCategory } from '@/lib/supabase/database.types';

type MemberFilter = 'all' | 'unassigned' | string;

export default function RecordsListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RecordCategory | 'all'>('all');
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');

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
    const [recordsRes, membersRes] = await Promise.all([
      getSupabase()
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
    ]);

    if (recordsRes.error) {
      setError(recordsRes.error.message);
      setRecords([]);
    } else {
      setRecords(recordsRes.data ?? []);
    }
    setMembers(membersRes.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(
    () =>
      records.filter((record) => {
        if (categoryFilter !== 'all' && record.category !== categoryFilter) {
          return false;
        }
        if (memberFilter === 'unassigned' && record.family_member_id) {
          return false;
        }
        if (
          memberFilter !== 'all' &&
          memberFilter !== 'unassigned' &&
          record.family_member_id !== memberFilter
        ) {
          return false;
        }
        const memberName = record.family_member_id
          ? (memberById.get(record.family_member_id)?.full_name ?? null)
          : null;
        return matchesRecordQuery(record, query, memberName);
      }),
    [records, categoryFilter, memberFilter, query, memberById]
  );

  const timeline = useMemo(() => {
    const groups: { label: string; items: MedicalRecord[] }[] = [];
    for (const record of filtered) {
      const label = recordTimelineGroup(record);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(record);
      } else {
        groups.push({ label, items: [record] });
      }
    }
    return groups;
  }, [filtered]);

  const hasActiveFilters =
    categoryFilter !== 'all' || memberFilter !== 'all' || query.trim().length > 0;

  function clearFilters() {
    setCategoryFilter('all');
    setMemberFilter('all');
    setQuery('');
  }

  return (
    <Screen
      title="Records"
      subtitle="Your family's medical document vault."
      headerRight={
        !loading && records.length > 0 ? (
          <Button label="Add" icon="add" size="sm" onPress={() => router.push('/health/records/new')} />
        ) : undefined
      }>
      {loading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline" tint="red" title="Couldn't load records" message={error}>
          <Button label="Try again" icon="refresh" onPress={load} />
        </EmptyState>
      ) : records.length === 0 ? (
        <EmptyState
          icon="folder-open"
          tint="violet"
          accessories={['document-text', 'images']}
          title="Start your vault"
          message="Save prescriptions, lab reports, scans, and bills — organized, searchable, and always with you.">
          <Button
            label="Add your first record"
            icon="add-circle"
            onPress={() => router.push('/health/records/new')}
          />
        </EmptyState>
      ) : (
        <>
          <TextField
            icon="search"
            placeholder="Search title, tags, notes, or member"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <SelectChip
              label="All categories"
              selected={categoryFilter === 'all'}
              onPress={() => setCategoryFilter('all')}
            />
            {RECORD_CATEGORIES.map((category) => (
              <SelectChip
                key={category.value}
                label={category.label}
                selected={categoryFilter === category.value}
                onPress={() => setCategoryFilter(category.value)}
              />
            ))}
          </ScrollView>

          {members.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              <SelectChip
                label="Everyone"
                selected={memberFilter === 'all'}
                onPress={() => setMemberFilter('all')}
              />
              <SelectChip
                label="Unassigned"
                selected={memberFilter === 'unassigned'}
                onPress={() => setMemberFilter('unassigned')}
              />
              {members.map((member) => (
                <SelectChip
                  key={member.id}
                  label={member.full_name}
                  selected={memberFilter === member.id}
                  onPress={() => setMemberFilter(member.id)}
                />
              ))}
            </ScrollView>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              tint="slate"
              title="No matches"
              message={
                hasActiveFilters
                  ? 'Try clearing search or filters, or add a record for this person.'
                  : 'Nothing to show yet.'
              }>
              {hasActiveFilters ? (
                <Button label="Clear filters" icon="close-circle" variant="secondary" onPress={clearFilters} />
              ) : null}
            </EmptyState>
          ) : (
            timeline.map((group) => (
              <View key={group.label} style={styles.group}>
                <ThemedText type="label" themeColor="textTertiary">
                  {group.label}
                </ThemedText>
                <View style={styles.list}>
                  {group.items.map((record, index) => {
                    const visual = recordVisual(record.category);
                    const memberName = record.family_member_id
                      ? memberById.get(record.family_member_id)?.full_name
                      : null;
                    return (
                      <Animated.View
                        key={record.id}
                        entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 50)}>
                        <PressableCard
                          style={styles.recordCard}
                          onPress={() => router.push(`/health/records/${record.id}`)}>
                          <IconBadge icon={visual.icon} tint={visual.tint} size={46} />
                          <View style={styles.recordBody}>
                            <ThemedText type="smallBold" numberOfLines={1}>
                              {record.title}
                            </ThemedText>
                            <ThemedText type="caption" themeColor="textSecondary">
                              {recordCategoryLabel(record.category)}
                              {record.record_date ? ` · ${formatDate(record.record_date)}` : ''}
                            </ThemedText>
                            {memberName ? (
                              <Chip label={memberName} tint="teal" icon="person" />
                            ) : null}
                            {record.tags.length > 0 ? (
                              <ThemedText
                                type="caption"
                                themeColor="textTertiary"
                                numberOfLines={1}>
                                #{record.tags.join('  #')}
                              </ThemedText>
                            ) : null}
                          </View>
                          {record.document_path ? (
                            <Chip
                              label={record.document_mime?.startsWith('image/') ? 'Image' : 'PDF'}
                              tint="blue"
                              icon="attach"
                            />
                          ) : null}
                          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                        </PressableCard>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.half,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  recordBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
