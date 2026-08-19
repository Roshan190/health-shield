import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SelectChip } from '@/components/chip';
import { SkeletonCard } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { safeBack } from '@/lib/navigation/safe-back';
import { policyTypeLabel } from '@/lib/policies/format';
import { policyVisual } from '@/lib/policies/visuals';
import { recordCategoryLabel, recordVisual } from '@/lib/records/format';
import { getSupabase } from '@/lib/supabase/client';
import type { MedicalRecord, Policy, VaultResourceType } from '@/lib/supabase/database.types';
import {
  VISIT_DISCLAIMER,
  VISIT_DURATIONS,
  createVisitConsent,
  doctorPortalUrl,
} from '@/lib/visit/api';

const emailSchema = z.string().trim().email('Enter a valid email');

type PackKey = `${VaultResourceType}:${string}`;

function packKey(type: VaultResourceType, id: string): PackKey {
  return `${type}:${id}`;
}

export default function NewVisitScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [hours, setHours] = useState<(typeof VISIT_DURATIONS)[number]['hours']>(24);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selected, setSelected] = useState<Set<PackKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const [policiesRes, recordsRes] = await Promise.all([
      supabase.from('policies').select('*').order('created_at', { ascending: false }),
      supabase.from('medical_records').select('*').order('created_at', { ascending: false }),
    ]);
    if (policiesRes.error) {
      setError(policiesRes.error.message);
      setPolicies([]);
      setRecords([]);
      setLoading(false);
      return;
    }
    const ownedPolicies = user
      ? (policiesRes.data ?? []).filter((p) => p.user_id === user.id)
      : [];
    const ownedRecords = user
      ? (recordsRes.data ?? []).filter((r) => r.user_id === user.id)
      : [];
    setPolicies(ownedPolicies);
    setRecords(ownedRecords);
    if (recordsRes.error) {
      setError(recordsRes.error.message);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const selectedCount = selected.size;
  const nothingToPick = useMemo(
    () => policies.length === 0 && records.length === 0,
    [policies.length, records.length]
  );

  function toggle(type: VaultResourceType, id: string) {
    const key = packKey(type, id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function onCreate() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }
    if (selected.size < 1) {
      setError('Pick at least one policy or medical record you own.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const items = [...selected].map((key) => {
        const [resource_type, resource_id] = key.split(':') as [VaultResourceType, string];
        return { resource_type, resource_id };
      });
      const consent = await createVisitConsent({
        doctorEmail: parsed.data,
        hours,
        items,
      });
      router.replace(`/visit/${consent.id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create visit pack');
      setSaving(false);
    }
  }

  return (
    <Screen title="New visit pack" subtitle={VISIT_DISCLAIMER}>
      {loading ? (
        <SkeletonCard />
      ) : nothingToPick ? (
        <EmptyState
          icon="folder-open"
          tint="slate"
          title="Nothing to share yet"
          message="Add a policy or medical record you own, then come back to build a visit pack.">
          <Button
            label="Back"
            variant="secondary"
            onPress={() => safeBack(router, '/visit')}
          />
        </EmptyState>
      ) : (
        <>
          <Card>
            <ThemedText type="section">Doctor email</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              They sign in at {doctorPortalUrl()} with this address. We do not email them for you.
            </ThemedText>
            <TextField
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <ThemedText type="section">Access lasts</ThemedText>
            <View style={styles.chips}>
              {VISIT_DURATIONS.map((option) => (
                <SelectChip
                  key={option.hours}
                  label={option.label}
                  selected={hours === option.hours}
                  onPress={() => setHours(option.hours)}
                />
              ))}
            </View>
          </Card>

          <Card>
            <ThemedText type="section">Policies ({policies.length})</ThemedText>
            {policies.length === 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                No owned policies.
              </ThemedText>
            ) : (
              policies.map((policy) => {
                const visual = policyVisual(policy.policy_type);
                const on = selected.has(packKey('policy', policy.id));
                return (
                  <PressableCard key={policy.id} onPress={() => toggle('policy', policy.id)}>
                    <View style={styles.pickRow}>
                      <IconBadge icon={visual.icon} tint={visual.tint} size={34} />
                      <View style={styles.grow}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {policy.insurer || 'Policy'}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {policyTypeLabel(policy.policy_type)}
                        </ThemedText>
                      </View>
                      <ThemedText type="caption" style={{ color: on ? theme.primary : theme.textSecondary }}>
                        {on ? 'Added' : 'Add'}
                      </ThemedText>
                    </View>
                  </PressableCard>
                );
              })
            )}
          </Card>

          <Card>
            <ThemedText type="section">Medical records ({records.length})</ThemedText>
            {records.length === 0 ? (
              <ThemedText type="caption" themeColor="textSecondary">
                No owned records.
              </ThemedText>
            ) : (
              records.map((record) => {
                const visual = recordVisual(record.category);
                const on = selected.has(packKey('medical_record', record.id));
                return (
                  <PressableCard key={record.id} onPress={() => toggle('medical_record', record.id)}>
                    <View style={styles.pickRow}>
                      <IconBadge icon={visual.icon} tint={visual.tint} size={34} />
                      <View style={styles.grow}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {record.title || recordCategoryLabel(record.category)}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {recordCategoryLabel(record.category)}
                        </ThemedText>
                      </View>
                      <ThemedText type="caption" style={{ color: on ? theme.primary : theme.textSecondary }}>
                        {on ? 'Added' : 'Add'}
                      </ThemedText>
                    </View>
                  </PressableCard>
                );
              })
            )}
          </Card>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button
            label={selectedCount ? `Grant pack (${selectedCount})` : 'Grant pack'}
            icon="send"
            onPress={() => void onCreate()}
            disabled={saving}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => safeBack(router, '/visit')}
            disabled={saving}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
