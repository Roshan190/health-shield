import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SelectChip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { FamilyMemberPicker } from '@/components/family-member-picker';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { parseTags, RECORD_CATEGORIES } from '@/lib/records/format';
import {
  attachDocumentsToRecord,
  pickRecordDocuments,
  type PickedRecordDoc,
} from '@/lib/records/upload';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember, RecordCategory } from '@/lib/supabase/database.types';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  category: z.enum([
    'prescription',
    'lab_report',
    'scan',
    'bill',
    'discharge_summary',
    'vaccination',
    'other',
  ]),
  record_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')
    .or(z.literal('')),
  tags: z.string().trim(),
  notes: z.string().trim(),
});

export default function NewRecordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('prescription');
  const [recordDate, setRecordDate] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [docs, setDocs] = useState<PickedRecordDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data } = await getSupabase()
          .from('family_members')
          .select('*')
          .order('full_name', { ascending: true });
        if (active) {
          setMembers(data ?? []);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  async function onPickDocument() {
    setError(null);
    try {
      const picked = await pickRecordDocuments({ multiple: true, maxFiles: 5 });
      if (picked.length) {
        setDocs(picked);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pick document');
    }
  }

  async function onSave() {
    if (!user) {
      setError('Not signed in');
      return;
    }

    setError(null);
    const parsed = schema.safeParse({
      title,
      category,
      record_date: recordDate,
      tags,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    setSaving(true);
    try {
      const { data: created, error: insertError } = await getSupabase()
        .from('medical_records')
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          category: parsed.data.category,
          record_date: parsed.data.record_date || null,
          tags: parseTags(parsed.data.tags),
          notes: parsed.data.notes || null,
          family_member_id: familyMemberId,
        })
        .select('*')
        .single();

      if (insertError || !created) {
        throw insertError ?? new Error('Could not create record');
      }

      if (docs.length > 0) {
        await attachDocumentsToRecord({
          userId: user.id,
          recordId: created.id,
          docs,
          startSortOrder: 0,
          setPrimary: true,
        });
      }

      router.replace(`/health/records/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Add record"
      subtitle="A document plus a few details, so you can find it later."
      headerRight={<IconBadge icon="folder-open" tint="violet" size={44} />}>
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-text" tint="blue" size={34} />
          <ThemedText type="section">Record details</ThemedText>
        </View>
        <TextField
          label="Title *"
          icon="create"
          placeholder="e.g. Annual blood test — Roshan"
          value={title}
          onChangeText={setTitle}
        />
        <ThemedText type="smallBold" themeColor="textSecondary">
          Category
        </ThemedText>
        <View style={styles.chips}>
          {RECORD_CATEGORIES.map((item) => (
            <SelectChip
              key={item.value}
              label={item.label}
              selected={category === item.value}
              onPress={() => setCategory(item.value)}
              disabled={saving}
            />
          ))}
        </View>
        <DateField
          label="Record date"
          value={recordDate}
          onChange={setRecordDate}
          maximumDate={new Date()}
          hint="The date on the document, used for the timeline."
        />
        <FamilyMemberPicker
          members={members}
          value={familyMemberId}
          onChange={setFamilyMemberId}
          disabled={saving}
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="pricetags" tint="teal" size={34} />
          <ThemedText type="section">Organize</ThemedText>
        </View>
        <TextField
          label="Tags"
          icon="pricetag"
          placeholder="e.g. diabetes, dr sharma, annual"
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
          hint="Comma-separated. Tags make search much faster."
        />
        <TextField
          label="Notes"
          icon="create"
          placeholder="Anything worth remembering"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
        />
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-attach" tint="amber" size={34} />
          <ThemedText type="section">Document</ThemedText>
        </View>
        {docs.length > 0 ? (
          docs.map((doc) => (
            <View
              key={`${doc.uri}-${doc.name}`}
              style={[styles.docRow, { backgroundColor: theme.surfaceMuted }]}>
              <IconBadge
                icon={doc.mimeType.startsWith('image/') ? 'image' : 'document-text'}
                tint="red"
                size={38}
              />
              <View style={styles.docBody}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {doc.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Attached to this record on save
                </ThemedText>
              </View>
            </View>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            PDF or photo (JPEG, PNG, WebP, HEIC), up to 10MB each. You can attach up to 5 files to
            the same record (e.g. scan + report).
          </ThemedText>
        )}
        <Button
          label={docs.length ? 'Choose different files' : 'Attach PDF or images'}
          icon="cloud-upload"
          variant="secondary"
          size="md"
          onPress={onPickDocument}
          disabled={saving}
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

      <Button
        label={docs.length > 1 ? `Save record with ${docs.length} files` : 'Save record'}
        icon="checkmark"
        loading={saving}
        onPress={onSave}
      />
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    padding: Spacing.two + Spacing.half,
    borderRadius: Radius.lg,
  },
  docBody: {
    flex: 1,
    gap: Spacing.half,
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
