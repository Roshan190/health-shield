import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import { safeBack } from '@/lib/navigation/safe-back';
import { formatDate, policyTypeLabel } from '@/lib/policies/format';
import { policyVisual } from '@/lib/policies/visuals';
import { recordCategoryLabel, recordVisual } from '@/lib/records/format';
import { getSupabase } from '@/lib/supabase/client';
import type { MedicalRecord, Policy, VisitConsent, VisitConsentItem } from '@/lib/supabase/database.types';
import {
  VISIT_DISCLAIMER,
  doctorPortalUrl,
  isVisitLive,
  listVisitConsentItems,
  revokeVisitConsent,
  visitStatusLabel,
  visitStatusTint,
} from '@/lib/visit/api';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [consent, setConsent] = useState<VisitConsent | null>(null);
  const [items, setItems] = useState<VisitConsentItem[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const [consentRes, itemRows] = await Promise.all([
      supabase.from('visit_consents').select('*').eq('id', id).maybeSingle(),
      listVisitConsentItems(id).catch((e: unknown) => {
        throw e;
      }),
    ]);
    if (consentRes.error) {
      setError(consentRes.error.message);
      setConsent(null);
      setLoading(false);
      return;
    }
    if (!consentRes.data) {
      setError('Visit pack not found.');
      setConsent(null);
      setLoading(false);
      return;
    }
    setConsent(consentRes.data);
    setItems(itemRows);

    const policyIds = itemRows.filter((i) => i.resource_type === 'policy').map((i) => i.resource_id);
    const recordIds = itemRows
      .filter((i) => i.resource_type === 'medical_record')
      .map((i) => i.resource_id);

    const [policiesRes, recordsRes] = await Promise.all([
      policyIds.length
        ? supabase.from('policies').select('*').in('id', policyIds)
        : Promise.resolve({ data: [] as Policy[], error: null }),
      recordIds.length
        ? supabase.from('medical_records').select('*').in('id', recordIds)
        : Promise.resolve({ data: [] as MedicalRecord[], error: null }),
    ]);
    setPolicies(policiesRes.data ?? []);
    setRecords(recordsRes.data ?? []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const live = useMemo(() => (consent ? isVisitLive(consent) : false), [consent]);

  async function onRevoke() {
    if (!consent) {
      return;
    }
    const ok = await confirmAction({
      title: 'Revoke this visit pack?',
      message: `${consent.doctor_email} will lose access immediately. Files in your vault stay put.`,
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await revokeVisitConsent(consent.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Visit pack">
        <SkeletonCard />
      </Screen>
    );
  }

  if (!consent) {
    return (
      <Screen title="Visit pack">
        <EmptyState
          icon="alert-circle"
          tint="red"
          title="Visit pack not found"
          message={error ?? 'This pack may have been removed.'}>
          <Button label="Back" variant="secondary" onPress={() => safeBack(router, '/visit')} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title="Visit pack" subtitle={VISIT_DISCLAIMER}>
      <Card>
        <View style={styles.headerRow}>
          <IconBadge icon="medkit" tint="teal" size={40} />
          <View style={styles.grow}>
            <ThemedText type="smallBold">{consent.doctor_email}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Until {formatDate(consent.expires_at.slice(0, 10))}
            </ThemedText>
          </View>
          <Chip label={visitStatusLabel(consent)} tint={visitStatusTint(consent)} />
        </View>
      </Card>

      <Card>
        <ThemedText type="section">In this pack</ThemedText>
        {policies.map((policy) => {
          const visual = policyVisual(policy.policy_type);
          return (
            <View key={policy.id} style={styles.item}>
              <IconBadge icon={visual.icon} tint={visual.tint} size={34} />
              <View style={styles.grow}>
                <ThemedText type="smallBold">{policy.insurer}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {policyTypeLabel(policy.policy_type)}
                </ThemedText>
              </View>
            </View>
          );
        })}
        {records.map((record) => {
          const visual = recordVisual(record.category);
          return (
            <View key={record.id} style={styles.item}>
              <IconBadge icon={visual.icon} tint={visual.tint} size={34} />
              <View style={styles.grow}>
                <ThemedText type="smallBold">{record.title || recordCategoryLabel(record.category)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {recordCategoryLabel(record.category)}
                </ThemedText>
              </View>
            </View>
          );
        })}
        {items.length === 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            No items on this pack.
          </ThemedText>
        ) : null}
      </Card>

      <Card variant="muted">
        <ThemedText type="caption" themeColor="textSecondary">
          Ask the doctor to open {doctorPortalUrl()} and sign in with {consent.doctor_email}.
        </ThemedText>
      </Card>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {live ? (
        <>
          <Button
            label="Open doctor website"
            icon="open-outline"
            variant="secondary"
            onPress={() => void WebBrowser.openBrowserAsync(doctorPortalUrl())}
            disabled={busy}
          />
          <Button label="Revoke access" icon="close-circle" onPress={() => void onRevoke()} disabled={busy} />
        </>
      ) : null}
      <Button label="Back" variant="secondary" onPress={() => safeBack(router, '/visit')} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
