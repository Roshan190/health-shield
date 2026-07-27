import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { Chip, SelectChip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  FAMILY_RELATIONSHIPS,
  FAMILY_ROLES,
  relationshipLabel,
  roleLabel,
} from '@/lib/family/format';
import { memberVisual, roleTint } from '@/lib/family/visuals';
import {
  formatDate,
  formatInrCompact,
  policyTypeLabel,
  renewalLabel,
} from '@/lib/policies/format';
import { policyVisual } from '@/lib/policies/visuals';
import { recordCategoryLabel, recordVisual } from '@/lib/records/format';
import { getSupabase } from '@/lib/supabase/client';
import type {
  FamilyMember,
  FamilyRelationship,
  FamilyRole,
  MedicalRecord,
  Policy,
} from '@/lib/supabase/database.types';

const schema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'other']),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')
    .or(z.literal('')),
  blood_group: z.string().trim(),
  role: z.enum(['manager', 'viewer']),
  notes: z.string().trim(),
});

export default function FamilyMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [linkedPolicies, setLinkedPolicies] = useState<Policy[]>([]);
  const [linkedRecords, setLinkedRecords] = useState<MedicalRecord[]>([]);
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('other');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [role, setRole] = useState<FamilyRole>('viewer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hydrate = useCallback((row: FamilyMember) => {
    setMember(row);
    setFullName(row.full_name);
    setRelationship(row.relationship);
    setDateOfBirth(row.date_of_birth ?? '');
    setBloodGroup(row.blood_group ?? '');
    setRole(row.role);
    setNotes(row.notes ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const [memberRes, policiesRes, recordsRes] = await Promise.all([
      getSupabase().from('family_members').select('*').eq('id', id).maybeSingle(),
      getSupabase()
        .from('policies')
        .select('*')
        .eq('family_member_id', id)
        .order('renewal_date', { ascending: true, nullsFirst: false }),
      getSupabase()
        .from('medical_records')
        .select('*')
        .eq('family_member_id', id)
        .order('record_date', { ascending: false, nullsFirst: false }),
    ]);

    setLinkedPolicies(policiesRes.data ?? []);
    setLinkedRecords(recordsRes.data ?? []);

    if (memberRes.error) {
      setError(memberRes.error.message);
    } else if (!memberRes.data) {
      setError('Member not found');
    } else {
      hydrate(memberRes.data);
      setError(null);
    }
    setLoading(false);
  }, [hydrate, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onSave() {
    if (!user || !id) {
      return;
    }
    setError(null);
    setStatus(null);

    const parsed = schema.safeParse({
      full_name: fullName,
      relationship,
      date_of_birth: dateOfBirth,
      blood_group: bloodGroup,
      role,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await getSupabase()
      .from('family_members')
      .update({
        full_name: parsed.data.full_name,
        relationship: parsed.data.relationship,
        date_of_birth: parsed.data.date_of_birth || null,
        blood_group: parsed.data.blood_group || null,
        role: parsed.data.role,
        notes: parsed.data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    setSaving(false);

    if (saveError || !data) {
      setError(saveError?.message ?? 'Could not save');
      return;
    }

    hydrate(data);
    setStatus('Member updated.');
  }

  function onDelete() {
    if (!id) {
      return;
    }
    Alert.alert(
      'Remove member?',
      'Removes this household profile. Linked policies and records stay in your vault but become unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await getSupabase()
              .from('family_members')
              .delete()
              .eq('id', id);
            if (deleteError) {
              setError(deleteError.message);
              return;
            }
            router.replace('/family');
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen title="Member" subtitle="Loading…">
        <Card>
          <Skeleton width="60%" height={22} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      </Screen>
    );
  }

  if (!member) {
    return (
      <Screen title="Member" subtitle="Not found">
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error ?? 'Member not found'}
          </ThemedText>
        </Card>
        <Button label="Back to family" variant="secondary" onPress={() => router.replace('/family')} />
      </Screen>
    );
  }

  const visual = memberVisual(member.relationship);
  const hasLinks = linkedPolicies.length > 0 || linkedRecords.length > 0;

  return (
    <Screen
      title={member.full_name}
      subtitle={`${relationshipLabel(member.relationship)}${
        member.date_of_birth ? ` · Born ${formatDate(member.date_of_birth)}` : ''
      }`}
      headerRight={<IconBadge icon={visual.icon} tint={visual.tint} size={44} />}>
      <Card style={styles.summaryCard}>
        <Chip
          label={roleLabel(member.role)}
          tint={roleTint(member.role)}
          icon={member.role === 'manager' ? 'key' : 'eye'}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          This is a profile on your account — not a separate login. Roles do not grant access.
          Policies and records stay private to you (D-008).
        </ThemedText>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="link" tint="teal" size={34} />
          <ThemedText type="section">Linked on your vault</ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          Items you tagged for {member.full_name}. They still belong only to your login.
        </ThemedText>

        {!hasLinks ? (
          <ThemedText type="small" themeColor="textTertiary">
            Nothing linked yet. Assign a covered member on a policy or a family member on a
            record.
          </ThemedText>
        ) : null}

        {linkedPolicies.length > 0 ? (
          <View style={styles.linkBlock}>
            <ThemedText type="smallBold">Policies ({linkedPolicies.length})</ThemedText>
            {linkedPolicies.map((policy) => {
              const pVisual = policyVisual(policy.policy_type);
              return (
                <PressableCard
                  key={policy.id}
                  style={styles.linkCard}
                  onPress={() => router.push(`/policies/${policy.id}`)}>
                  <IconBadge icon={pVisual.icon} tint={pVisual.tint} size={40} />
                  <View style={styles.linkBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {policy.insurer}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {policyTypeLabel(policy.policy_type)} ·{' '}
                      {formatInrCompact(policy.sum_insured)} · {renewalLabel(policy.renewal_date)}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </PressableCard>
              );
            })}
          </View>
        ) : null}

        {linkedRecords.length > 0 ? (
          <View style={styles.linkBlock}>
            <ThemedText type="smallBold">Records ({linkedRecords.length})</ThemedText>
            {linkedRecords.map((record) => {
              const rVisual = recordVisual(record.category);
              return (
                <PressableCard
                  key={record.id}
                  style={styles.linkCard}
                  onPress={() => router.push(`/health/records/${record.id}`)}>
                  <IconBadge icon={rVisual.icon} tint={rVisual.tint} size={40} />
                  <View style={styles.linkBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {record.title}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {recordCategoryLabel(record.category)}
                      {record.record_date ? ` · ${formatDate(record.record_date)}` : ''}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </PressableCard>
              );
            })}
          </View>
        ) : null}

        <View style={styles.linkActions}>
          <Button
            label="Add policy"
            icon="shield-checkmark"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/policies/new')}
            disabled={saving}
          />
          <Button
            label="Add record"
            icon="folder-open"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/health/records/new')}
            disabled={saving}
          />
        </View>
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="person" tint="blue" size={34} />
          <ThemedText type="section">Basics</ThemedText>
        </View>
        <TextField label="Full name" icon="person" value={fullName} onChangeText={setFullName} />
        <ThemedText type="smallBold" themeColor="textSecondary">
          Relationship
        </ThemedText>
        <View style={styles.chips}>
          {FAMILY_RELATIONSHIPS.map((item) => (
            <SelectChip
              key={item.value}
              label={item.label}
              selected={relationship === item.value}
              onPress={() => setRelationship(item.value)}
              disabled={saving}
            />
          ))}
        </View>
        <DateField
          label="Date of birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          maximumDate={new Date()}
        />
        <TextField
          label="Blood group"
          icon="water"
          value={bloodGroup}
          onChangeText={setBloodGroup}
          autoCapitalize="characters"
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="key" tint="amber" size={34} />
          <ThemedText type="section">Intended role</ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          Intent only — not a separate login, and not shared access yet.
        </ThemedText>
        <View style={styles.chips}>
          {FAMILY_ROLES.map((item) => (
            <SelectChip
              key={item.value}
              label={item.label}
              selected={role === item.value}
              onPress={() => setRole(item.value)}
              disabled={saving}
            />
          ))}
        </View>
        <ThemedText type="caption" themeColor="textTertiary">
          {FAMILY_ROLES.find((r) => r.value === role)?.hint}
        </ThemedText>
        <TextField
          label="Notes"
          icon="create"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
        />
      </Card>

      {error ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            {error}
          </ThemedText>
        </Card>
      ) : null}
      {status ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.noticeText}>
            {status}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Save changes" icon="checkmark" loading={saving} onPress={onSave} />
      <Button label="Remove member" variant="danger" onPress={onDelete} disabled={saving} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: Spacing.two,
  },
  formCard: {
    gap: Spacing.three,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  linkBlock: {
    gap: Spacing.two,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  linkBody: {
    flex: 1,
    gap: Spacing.half,
  },
  linkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
