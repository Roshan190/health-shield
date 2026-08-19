import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { Chip, SelectChip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SkeletonCard } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import {
  CLAIM_DISCLAIMER,
  CLAIM_STATUSES,
  claimStatusLabel,
  claimStatusTint,
} from '@/lib/claims/api';
import { safeBack } from '@/lib/navigation/safe-back';
import { formatDate } from '@/lib/policies/format';
import { recordCategoryLabel, recordVisual } from '@/lib/records/format';
import { getSupabase } from '@/lib/supabase/client';
import type {
  Claim,
  ClaimChecklistItem,
  ClaimStatus,
  MedicalRecord,
  Policy,
} from '@/lib/supabase/database.types';

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [items, setItems] = useState<ClaimChecklistItem[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [hospitalName, setHospitalName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const [claimRes, itemsRes, recordsRes] = await Promise.all([
      supabase.from('claims').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('claim_checklist_items')
        .select('*')
        .eq('claim_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
    ]);

    if (claimRes.error) {
      setError(claimRes.error.message);
      setClaim(null);
      setLoading(false);
      return;
    }
    if (!claimRes.data) {
      setError('Claim not found');
      setClaim(null);
      setLoading(false);
      return;
    }

    setClaim(claimRes.data);
    setHospitalName(claimRes.data.hospital_name ?? '');
    setNotes(claimRes.data.notes ?? '');
    setItems(itemsRes.data ?? []);
    setRecords(recordsRes.data ?? []);

    const { data: policyRow } = await supabase
      .from('policies')
      .select('*')
      .eq('id', claimRes.data.policy_id)
      .maybeSingle();
    setPolicy(policyRow ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const recordById = useMemo(() => {
    const map = new Map<string, MedicalRecord>();
    for (const record of records) {
      map.set(record.id, record);
    }
    return map;
  }, [records]);

  const ownedRecords = useMemo(
    () => (claim ? records.filter((r) => r.user_id === claim.user_id) : []),
    [claim, records]
  );

  const progress = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.done).length;
    return { done, total };
  }, [items]);

  const persistClaim = async (patch: Partial<Claim>) => {
    if (!claim) {
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    const { data, error: updateError } = await getSupabase()
      .from('claims')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', claim.id)
      .select('*')
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Could not save claim');
      return;
    }
    setClaim(data);
    setStatusMessage('Saved');
  };

  const persistItem = async (itemId: string, patch: Partial<ClaimChecklistItem>) => {
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await getSupabase()
      .from('claim_checklist_items')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Could not update checklist item');
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === itemId ? data : row)));
  };

  const onStatus = (status: ClaimStatus) => {
    void persistClaim({ status });
  };

  const onSaveDetails = () => {
    void persistClaim({
      hospital_name: hospitalName.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const confirmDelete = async () => {
    if (!claim) {
      return;
    }
    const ok = await confirmAction({
      title: 'Delete this checklist?',
      message: 'This only deletes the organizer in HealthShield. It does not affect the insurer.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setSaving(true);
    const { error: deleteError } = await getSupabase().from('claims').delete().eq('id', claim.id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace('/claims' as Href);
  };

  if (loading) {
    return (
      <Screen title="Claim" subtitle={CLAIM_DISCLAIMER}>
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  if (!claim) {
    return (
      <Screen title="Claim">
        <EmptyState
          icon="folder-open"
          tint="red"
          title="Couldn't open this claim"
          message={error ?? 'Claim not found'}>
          <Button
            label="Back to claims"
            variant="secondary"
            icon="arrow-back"
            onPress={() => router.replace('/claims' as Href)}
          />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen
      title={policy?.insurer ?? 'Claim checklist'}
      subtitle={
        policy
          ? `№ ${policy.policy_number} · ${progress.done}/${progress.total} ready`
          : CLAIM_DISCLAIMER
      }>
      <Card variant="muted">
        <ThemedText type="caption" themeColor="textSecondary">
          {CLAIM_DISCLAIMER}
        </ThemedText>
      </Card>

      <Card style={styles.block}>
        <View style={styles.titleRow}>
          <IconBadge icon="flag" tint={claimStatusTint(claim.status)} size={34} />
          <View style={styles.titleCopy}>
            <ThemedText type="section">Status</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              You set this. It is not synced with the insurer.
            </ThemedText>
          </View>
        </View>
        <View style={styles.chips}>
          {CLAIM_STATUSES.map((s) => (
            <SelectChip
              key={s.value}
              label={s.label}
              selected={claim.status === s.value}
              onPress={() => onStatus(s.value)}
              disabled={saving}
            />
          ))}
        </View>
        <Chip label={claimStatusLabel(claim.status)} tint={claimStatusTint(claim.status)} />
      </Card>

      <Card style={styles.block}>
        <View style={styles.titleRow}>
          <IconBadge icon="checkbox" tint="amber" size={34} />
          <View style={styles.titleCopy}>
            <ThemedText type="section">Documents</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Typical India health-claim papers. Tick what you have; link a vault record if it is
              already uploaded.
            </ThemedText>
          </View>
        </View>
        {items.map((item) => {
          const linked = item.medical_record_id
            ? recordById.get(item.medical_record_id)
            : undefined;
          return (
            <View
              key={item.id}
              style={[styles.itemRow, { borderColor: theme.border }]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done, disabled: saving }}
                disabled={saving}
                onPress={() => {
                  void persistItem(item.id, { done: !item.done });
                }}
                style={styles.checkHit}>
                <Ionicons
                  name={item.done ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={item.done ? theme.primary : theme.textTertiary}
                />
              </Pressable>
              <View style={styles.itemBody}>
                <ThemedText type="smallBold">{item.label}</ThemedText>
                {linked ? (
                  <Chip
                    label={linked.title}
                    tint={recordVisual(linked.category).tint}
                    icon={recordVisual(linked.category).icon}
                  />
                ) : (
                  <ThemedText type="caption" themeColor="textTertiary">
                    Not linked
                  </ThemedText>
                )}
                <View style={styles.itemActions}>
                  {linked ? (
                    <>
                      <Button
                        label="Open record"
                        size="sm"
                        variant="ghost"
                        onPress={() => router.push(`/health/records/${linked.id}` as Href)}
                        disabled={saving}
                      />
                      <Button
                        label="Unlink"
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          void persistItem(item.id, { medical_record_id: null });
                        }}
                        disabled={saving}
                      />
                    </>
                  ) : (
                    <Button
                      label="Link from vault"
                      size="sm"
                      variant="secondary"
                      icon="link"
                      onPress={() => setLinkingItemId(item.id)}
                      disabled={saving}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={styles.block}>
        <ThemedText type="section">Details</ThemedText>
        <TextField
          label="Hospital"
          icon="business"
          value={hospitalName}
          onChangeText={setHospitalName}
          editable={!saving}
        />
        <TextField
          label="Notes"
          icon="create"
          value={notes}
          onChangeText={setNotes}
          multiline
          editable={!saving}
        />
        <ThemedText type="caption" themeColor="textTertiary">
          Started {formatDate(claim.created_at.slice(0, 10))}
        </ThemedText>
        {policy ? (
          <Button
            label="Open policy"
            variant="ghost"
            icon="shield-checkmark"
            onPress={() => router.push(`/policies/${policy.id}`)}
            disabled={saving}
          />
        ) : null}
        <Button
          label="Save details"
          icon="save"
          onPress={onSaveDetails}
          loading={saving}
          disabled={saving}
        />
      </Card>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      {statusMessage ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {statusMessage}
        </ThemedText>
      ) : null}

      <Button
        label="Delete checklist"
        variant="danger"
        icon="trash"
        onPress={() => {
          void confirmDelete();
        }}
        disabled={saving}
      />
      <Button
        label="Back"
        variant="ghost"
        onPress={() => safeBack(router, '/claims')}
        disabled={saving}
      />

      <Modal
        visible={linkingItemId != null}
        animationType="slide"
        onRequestClose={() => setLinkingItemId(null)}>
        <ThemedView style={styles.modalRoot}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.two }]}>
            <ThemedText type="subtitle">Link a vault record</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Only records you own. Linking does not send the file to the insurer.
            </ThemedText>
          </View>
          {ownedRecords.length === 0 ? (
            <EmptyState
              icon="document-text"
              tint="teal"
              title="No records yet"
              message="Add a medical record first, then link it here.">
              <Button
                label="Add a record"
                icon="add-circle"
                onPress={() => {
                  setLinkingItemId(null);
                  router.push('/health/records/new' as Href);
                }}
              />
            </EmptyState>
          ) : (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalList}
              keyboardShouldPersistTaps="handled">
              {ownedRecords.map((record) => {
                const visual = recordVisual(record.category);
                return (
                  <PressableCard
                    key={record.id}
                    style={styles.recordCard}
                    onPress={() => {
                      if (!linkingItemId) {
                        return;
                      }
                      const itemId = linkingItemId;
                      setLinkingItemId(null);
                      void persistItem(itemId, {
                        medical_record_id: record.id,
                        done: true,
                      });
                    }}>
                    <IconBadge icon={visual.icon} tint={visual.tint} size={40} />
                    <View style={styles.recordBody}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {record.title}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {recordCategoryLabel(record.category)}
                        {record.record_date ? ` · ${formatDate(record.record_date)}` : ''}
                      </ThemedText>
                    </View>
                  </PressableCard>
                );
              })}
            </ScrollView>
          )}
          <View style={{ paddingBottom: insets.bottom + Spacing.three, paddingHorizontal: Spacing.three }}>
            <Button label="Cancel" variant="ghost" onPress={() => setLinkingItemId(null)} />
          </View>
        </ThemedView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  titleCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkHit: {
    paddingTop: Spacing.half,
  },
  itemBody: {
    flex: 1,
    gap: Spacing.one,
  },
  itemActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  modalScroll: {
    flex: 1,
  },
  modalList: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
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
