import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, SelectChip } from '@/components/chip';
import { DateField } from '@/components/date-field';
import { FamilyMemberPicker } from '@/components/family-member-picker';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { formatDate } from '@/lib/policies/format';
import {
  formatTags,
  parseTags,
  RECORD_CATEGORIES,
  recordCategoryLabel,
  recordVisual,
} from '@/lib/records/format';
import {
  createSignedRecordUrl,
  deleteRecordDocument,
  pickRecordDocument,
  uploadRecordDocument,
  type PickedRecordDoc,
} from '@/lib/records/upload';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember, MedicalRecord, RecordCategory } from '@/lib/supabase/database.types';

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

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('other');
  const [recordDate, setRecordDate] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingDoc, setPendingDoc] = useState<PickedRecordDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hydrate = useCallback((row: MedicalRecord) => {
    setRecord(row);
    setTitle(row.title);
    setCategory(row.category);
    setRecordDate(row.record_date ?? '');
    setTags(formatTags(row.tags));
    setNotes(row.notes ?? '');
    setFamilyMemberId(row.family_member_id);
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const [recordRes, membersRes] = await Promise.all([
      getSupabase().from('medical_records').select('*').eq('id', id).maybeSingle(),
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
    ]);

    setMembers(membersRes.data ?? []);

    if (recordRes.error) {
      setError(recordRes.error.message);
    } else if (!recordRes.data) {
      setError('Record not found');
    } else {
      hydrate(recordRes.data);
      setError(null);
    }
    setLoading(false);
  }, [hydrate, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onPickDocument() {
    setError(null);
    try {
      const picked = await pickRecordDocument();
      if (picked) {
        setPendingDoc(picked);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pick document');
    }
  }

  async function onOpenDocument() {
    if (!record?.document_path) {
      return;
    }
    try {
      const url = await createSignedRecordUrl(record.document_path);
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document');
    }
  }

  async function onSave() {
    if (!user || !record) {
      return;
    }
    setError(null);
    setStatus(null);

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
      let documentPath = record.document_path;
      let documentName = record.document_name;
      let documentMime = record.document_mime;

      if (pendingDoc) {
        const uploaded = await uploadRecordDocument({
          userId: user.id,
          recordId: record.id,
          doc: pendingDoc,
          previousPath: record.document_path,
        });
        documentPath = uploaded.path;
        documentName = uploaded.name;
        documentMime = uploaded.mime;
        setPendingDoc(null);
      }

      const { data, error: updateError } = await getSupabase()
        .from('medical_records')
        .update({
          title: parsed.data.title,
          category: parsed.data.category,
          record_date: parsed.data.record_date || null,
          tags: parseTags(parsed.data.tags),
          notes: parsed.data.notes || null,
          family_member_id: familyMemberId,
          document_path: documentPath,
          document_name: documentName,
          document_mime: documentMime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id)
        .select('*')
        .single();

      if (updateError || !data) {
        throw updateError ?? new Error('Update failed');
      }

      hydrate(data);
      setStatus('Record saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete record?', 'This removes the record and its document from HealthShield.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void onDelete();
        },
      },
    ]);
  }

  async function onDelete() {
    if (!record) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (record.document_path) {
        await deleteRecordDocument(record.document_path);
      }
      const { error: deleteError } = await getSupabase()
        .from('medical_records')
        .delete()
        .eq('id', record.id);
      if (deleteError) {
        throw deleteError;
      }
      router.replace('/health/records');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Record">
        <Card>
          <Skeleton width="50%" height={20} />
          <Skeleton width="70%" height={14} />
        </Card>
        <Card>
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      </Screen>
    );
  }

  if (!record) {
    return (
      <Screen title="Record">
        <Card style={styles.notFoundCard}>
          <IconBadge icon="alert-circle" tint="red" size={46} shape="circle" />
          <ThemedText type="smallBold">{error ?? 'Record not found'}</ThemedText>
        </Card>
        <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const visual = recordVisual(record.category);

  return (
    <Screen
      title={record.title}
      subtitle={`${recordCategoryLabel(record.category)}${
        record.record_date ? ` · ${formatDate(record.record_date)}` : ''
      }`}
      headerRight={<IconBadge icon={visual.icon} tint={visual.tint} size={44} />}>
      {/* ——— Record details ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-text" tint="blue" size={34} />
          <ThemedText type="section">Record details</ThemedText>
        </View>
        <TextField label="Title" icon="create" value={title} onChangeText={setTitle} />
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
        />
        <FamilyMemberPicker
          members={members}
          value={familyMemberId}
          onChange={setFamilyMemberId}
          disabled={saving}
        />
      </Card>

      {/* ——— Organize ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="pricetags" tint="teal" size={34} />
          <ThemedText type="section">Organize</ThemedText>
        </View>
        <TextField
          label="Tags"
          icon="pricetag"
          placeholder="Comma-separated"
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
        />
        <TextField
          label="Notes"
          icon="create"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
        />
      </Card>

      {/* ——— Document ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-attach" tint="amber" size={34} />
          <ThemedText type="section">Document</ThemedText>
        </View>
        {record.document_path ? (
          <View style={[styles.docRow, { backgroundColor: theme.surfaceMuted }]}>
            <IconBadge
              icon={record.document_mime?.startsWith('image/') ? 'image' : 'document-text'}
              tint="red"
              size={38}
            />
            <View style={styles.docBody}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {record.document_name ?? 'Document'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Stored in private, access-controlled storage
              </ThemedText>
            </View>
            <Button
              label="Open"
              size="sm"
              variant="secondary"
              onPress={onOpenDocument}
              disabled={saving}
            />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No document attached yet.
          </ThemedText>
        )}
        {pendingDoc ? <Chip label={`Replace with: ${pendingDoc.name}`} tint="blue" icon="attach" /> : null}
        <Button
          label={
            pendingDoc
              ? 'Choose a different file'
              : record.document_path
                ? 'Replace document'
                : 'Attach PDF or image'
          }
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
      {status ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          <ThemedText type="small" themeColor="success" style={styles.noticeText}>
            {status}
          </ThemedText>
        </Card>
      ) : null}

      <Button label="Save changes" icon="checkmark" loading={saving} onPress={onSave} />
      <Button
        label="Delete record"
        variant="danger"
        icon="trash"
        onPress={confirmDelete}
        disabled={saving}
      />
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
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
  notFoundCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
});
