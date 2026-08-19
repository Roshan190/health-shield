import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { CLAIM_DISCLAIMER, createClaimWithChecklist } from '@/lib/claims/api';
import { safeBack } from '@/lib/navigation/safe-back';
import { policyTypeLabel } from '@/lib/policies/format';
import { policyVisual } from '@/lib/policies/visuals';
import { getSupabase } from '@/lib/supabase/client';
import type { Policy } from '@/lib/supabase/database.types';

export default function NewClaimScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);
  const params = useLocalSearchParams<{ policyId?: string | string[] }>();
  const preselectedId = Array.isArray(params.policyId) ? params.policyId[0] : params.policyId;

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState<string | null>(preselectedId ?? null);
  const [hospitalName, setHospitalName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await getSupabase()
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setPolicies([]);
    } else {
      const owned = user ? (data ?? []).filter((p) => p.user_id === user.id) : (data ?? []);
      setPolicies(owned);
      setPolicyId((current) => {
        if (current && owned.some((p) => p.id === current)) {
          return current;
        }
        if (preselectedId && owned.some((p) => p.id === preselectedId)) {
          return preselectedId;
        }
        return owned.length === 1 ? owned[0].id : current;
      });
    }
    setLoading(false);
  }, [preselectedId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selected = useMemo(
    () => policies.find((p) => p.id === policyId) ?? null,
    [policies, policyId]
  );

  const onCreate = async () => {
    if (!user || !policyId) {
      setError('Pick a policy you own.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const claim = await createClaimWithChecklist({
        userId: user.id,
        policyId,
        hospitalName,
        notes,
      });
      router.replace(`/claims/${claim.id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create claim');
      setSaving(false);
    }
  };

  return (
    <Screen title="New claim checklist" subtitle={CLAIM_DISCLAIMER}>
      {loading ? (
        <SkeletonCard />
      ) : policies.length === 0 ? (
        <EmptyState
          icon="shield-checkmark"
          tint="blue"
          title="No owned policies"
          message="Add a policy first. Shared policies cannot start a claim checklist — only the owner can.">
          <Button
            label="Add a policy"
            icon="add-circle"
            onPress={() => router.push('/policies/new')}
          />
        </EmptyState>
      ) : (
        <>
          <ThemedText type="section">Policy</ThemedText>
          <View style={styles.policyList}>
            {policies.map((policy) => {
              const visual = policyVisual(policy.policy_type);
              const active = policy.id === policyId;
              return (
                <PressableCard
                  key={policy.id}
                  onPress={() => setPolicyId(policy.id)}
                  style={[
                    styles.policyCard,
                    active ? { borderColor: theme.primary } : undefined,
                  ]}>
                  <IconBadge icon={visual.icon} tint={visual.tint} size={40} />
                  <View style={styles.policyBody}>
                    <ThemedText type="smallBold">{policy.insurer}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {policyTypeLabel(policy.policy_type)} · № {policy.policy_number}
                    </ThemedText>
                  </View>
                  {active ? (
                    <IconBadge icon="checkmark" tint="teal" size={28} />
                  ) : null}
                </PressableCard>
              );
            })}
          </View>

          <TextField
            label="Hospital (optional)"
            icon="business"
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="Where you were treated"
            editable={!saving}
          />
          <TextField
            label="Notes (optional)"
            icon="create"
            value={notes}
            onChangeText={setNotes}
            placeholder="Claim number, TPA, dates…"
            multiline
            editable={!saving}
          />

          {selected ? (
            <Card variant="muted">
              <ThemedText type="caption" themeColor="textSecondary">
                Checklist will be created for {selected.insurer} (№ {selected.policy_number}). You
                file with the insurer yourself.
              </ThemedText>
            </Card>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button
            label="Create checklist"
            icon="add-circle"
            onPress={() => {
              void onCreate();
            }}
            loading={saving}
            disabled={!policyId || saving}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => safeBack(router, '/claims')}
            disabled={saving}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  policyList: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  policyBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
