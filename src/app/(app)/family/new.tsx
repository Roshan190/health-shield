import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectChip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { FAMILY_RELATIONSHIPS, FAMILY_ROLES } from '@/lib/family/format';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyRelationship, FamilyRole } from '@/lib/supabase/database.types';

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

export default function NewFamilyMemberScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('spouse');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [role, setRole] = useState<FamilyRole>('viewer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!user) {
      setError('Not signed in');
      return;
    }

    setError(null);
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
    try {
      const { data: created, error: insertError } = await getSupabase()
        .from('family_members')
        .insert({
          user_id: user.id,
          full_name: parsed.data.full_name,
          relationship: parsed.data.relationship,
          date_of_birth: parsed.data.date_of_birth || null,
          blood_group: parsed.data.blood_group || null,
          role: parsed.data.role,
          notes: parsed.data.notes || null,
        })
        .select('*')
        .single();

      if (insertError || !created) {
        throw insertError ?? new Error('Could not add member');
      }

      router.replace(`/family/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Add member"
      subtitle="A household profile — not a separate login yet."
      headerRight={<IconBadge icon="person-add" tint="amber" size={44} />}>
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="person" tint="blue" size={34} />
          <ThemedText type="section">Basics</ThemedText>
        </View>
        <TextField
          label="Full name *"
          icon="person"
          placeholder="e.g. Priya Sharma"
          value={fullName}
          onChangeText={setFullName}
        />
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
          hint="Optional — helps emergency and age-aware reminders later."
        />
        <TextField
          label="Blood group"
          icon="water"
          placeholder="e.g. B+"
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
          Saved for when invites land. Does not change who can see your data today.
        </ThemedText>
        <View style={styles.roleList}>
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
          placeholder="Anything useful for the household"
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

      <Button label="Save member" icon="checkmark" loading={saving} onPress={onSave} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  roleList: {
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
