import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
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
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type {
  FamilyMember,
  FamilyRelationship,
  FamilyRole,
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
    const { data, error: loadError } = await getSupabase()
      .from('family_members')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
    } else if (!data) {
      setError('Member not found');
    } else {
      hydrate(data);
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
    Alert.alert('Remove member?', 'This only removes their household profile from your account.', [
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
    ]);
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
          Policies and records remain private to your login. This role is for future household
          sharing.
        </ThemedText>
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
