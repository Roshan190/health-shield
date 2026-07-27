import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AiSummaryCard } from '@/components/ai-summary-card';
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
import { VaultItemShareCard } from '@/components/vault-item-share-card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SummarizeError, summarizeItem } from '@/lib/ai/summarize';
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
  attachDocumentsToRecord,
  createSignedRecordUrl,
  deleteRecordDocument,
  deleteRecordDocumentRow,
  listRecordDocuments,
  pickRecordDocuments,
  type PickedRecordDoc,
} from '@/lib/records/upload';
import { getSupabase } from '@/lib/supabase/client';
import type {
  FamilyMember,
  MedicalRecord,
  MedicalRecordDocument,
  RecordCategory,
} from '@/lib/supabase/database.types';

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

function sameTags(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((tag, i) => tag === right[i]);
}

function isRecordFormDirty(
  record: MedicalRecord,
  fields: {
    title: string;
    category: RecordCategory;
    recordDate: string;
    tags: string;
    notes: string;
    familyMemberId: string | null;
    pendingDocs: PickedRecordDoc[];
  }
) {
  if (fields.pendingDocs.length > 0) {
    return true;
  }
  return (
    fields.title !== record.title ||
    fields.category !== record.category ||
    (fields.recordDate || null) !== record.record_date ||
    !sameTags(parseTags(fields.tags), record.tags ?? []) ||
    (fields.notes.trim() || null) !== record.notes ||
    fields.familyMemberId !== record.family_member_id
  );
}

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
  const [pendingDocs, setPendingDocs] = useState<PickedRecordDoc[]>([]);
  const [documents, setDocuments] = useState<MedicalRecordDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryDisclaimer, setSummaryDisclaimer] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

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
    const [recordRes, membersRes, docsRes] = await Promise.all([
      getSupabase().from('medical_records').select('*').eq('id', id).maybeSingle(),
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
      listRecordDocuments(id).catch(() => [] as MedicalRecordDocument[]),
    ]);

    setMembers(membersRes.data ?? []);
    setDocuments(docsRes);

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
      const remaining = Math.max(0, 5 - documents.length - pendingDocs.length);
      if (remaining <= 0) {
        setError('This record already has 5 files (max).');
        return;
      }
      const picked = await pickRecordDocuments({ multiple: true, maxFiles: remaining });
      if (picked.length) {
        setPendingDocs((prev) => [...prev, ...picked].slice(0, 5 - documents.length));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pick document');
    }
  }

  async function onOpenDocumentPath(path: string) {
    try {
      const url = await createSignedRecordUrl(path);
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document');
    }
  }

  async function onRemoveDocument(doc: MedicalRecordDocument) {
    if (!record) {
      return;
    }
    Alert.alert('Remove file?', `Remove “${doc.document_name}” from this record?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            setError(null);
            try {
              await deleteRecordDocumentRow({
                id: doc.id,
                path: doc.document_path,
                recordId: record.id,
                wasPrimary: record.document_path === doc.document_path,
              });
              const [freshRecord, freshDocs] = await Promise.all([
                getSupabase().from('medical_records').select('*').eq('id', record.id).single(),
                listRecordDocuments(record.id),
              ]);
              if (freshRecord.data) {
                hydrate(freshRecord.data);
              }
              setDocuments(freshDocs);
              setStatus('File removed.');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not remove file');
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
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
      if (pendingDocs.length > 0) {
        await attachDocumentsToRecord({
          userId: user.id,
          recordId: record.id,
          docs: pendingDocs,
          startSortOrder: documents.length,
          setPrimary: documents.length === 0,
        });
        setPendingDocs([]);
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id)
        .select('*')
        .single();

      if (updateError || !data) {
        throw updateError ?? new Error('Update failed');
      }

      hydrate(data);
      setDocuments(await listRecordDocuments(record.id));
      setStatus('Record saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete record?',
      'This removes the record and all attached documents from HealthShield.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void onDelete();
          },
        },
      ]
    );
  }

  async function onDelete() {
    if (!record) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const paths = documents.map((d) => d.document_path);
      if (record.document_path && !paths.includes(record.document_path)) {
        paths.push(record.document_path);
      }
      for (const path of paths) {
        await deleteRecordDocument(path);
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

  async function onSummarize() {
    if (!record) {
      return;
    }
    if (
      isRecordFormDirty(record, {
        title,
        category,
        recordDate,
        tags,
        notes,
        familyMemberId,
        pendingDocs,
      })
    ) {
      Alert.alert('Save changes first', 'Summarize uses the last saved record details, not unsaved edits.');
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    try {
      const result = await summarizeItem('record', record.id);
      setSummary(result.summary);
      setSummaryDisclaimer(result.disclaimer);
    } catch (e) {
      setSummaryError(e instanceof SummarizeError ? e.message : 'Could not create a summary.');
    } finally {
      setSummarizing(false);
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
  const isOwner = Boolean(user && record.user_id === user.id);

  return (
    <Screen
      title={record.title}
      subtitle={`${isOwner ? '' : 'Shared · '}${recordCategoryLabel(record.category)}${
        record.record_date ? ` · ${formatDate(record.record_date)}` : ''
      }`}
      headerRight={<IconBadge icon={visual.icon} tint={visual.tint} size={44} />}>
      {!isOwner ? (
        <Card variant="tinted" style={styles.sharedBanner}>
          <IconBadge icon="eye" tint="teal" size={34} />
          <View style={styles.sharedBannerBody}>
            <ThemedText type="smallBold">Shared view</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              You can view this record. Only the owner can edit or share it.
            </ThemedText>
          </View>
        </Card>
      ) : null}

      <AiSummaryCard
        summary={summary}
        disclaimer={summaryDisclaimer}
        error={summaryError}
        loading={summarizing}
        disabled={saving}
        onSummarize={() => {
          void onSummarize();
        }}
      />

      {isOwner ? (
        <VaultItemShareCard
          ownerUserId={record.user_id}
          resourceType="medical_record"
          resourceId={record.id}
        />
      ) : null}

      {/* ——— Record details ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-text" tint="blue" size={34} />
          <ThemedText type="section">Record details</ThemedText>
        </View>
        <TextField
          label="Title"
          icon="create"
          value={title}
          onChangeText={setTitle}
          editable={isOwner}
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
              disabled={saving || !isOwner}
            />
          ))}
        </View>
        <DateField
          label="Record date"
          value={recordDate}
          onChange={setRecordDate}
          maximumDate={new Date()}
          disabled={!isOwner}
        />
        <FamilyMemberPicker
          members={members}
          value={familyMemberId}
          onChange={setFamilyMemberId}
          disabled={saving || !isOwner}
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
          editable={isOwner}
        />
        <TextField
          label="Notes"
          icon="create"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notesInput}
          editable={isOwner}
        />
      </Card>

      {/* ——— Documents ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-attach" tint="amber" size={34} />
          <ThemedText type="section">Documents</ThemedText>
        </View>
        {documents.length > 0 ? (
          documents.map((doc) => (
            <View
              key={doc.id}
              style={[styles.docRow, { backgroundColor: theme.surfaceMuted }]}>
              <IconBadge
                icon={doc.document_mime.startsWith('image/') ? 'image' : 'document-text'}
                tint="red"
                size={38}
              />
              <View style={styles.docBody}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {doc.document_name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {record.document_path === doc.document_path ? 'Primary · ' : ''}
                  Private storage
                </ThemedText>
              </View>
              <Button
                label="Open"
                size="sm"
                variant="secondary"
                onPress={() => onOpenDocumentPath(doc.document_path)}
                disabled={saving}
              />
              {isOwner ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove file"
                  onPress={() => onRemoveDocument(doc)}
                  disabled={saving}
                  hitSlop={8}
                  style={styles.removeDocBtn}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No documents attached yet. Add a scan and report together on one record.
          </ThemedText>
        )}
        {pendingDocs.length > 0 && isOwner
          ? pendingDocs.map((doc) => (
              <Chip
                key={`${doc.uri}-${doc.name}`}
                label={`Pending: ${doc.name}`}
                tint="blue"
                icon="attach"
              />
            ))
          : null}
        {isOwner ? (
          <Button
            label={
              pendingDocs.length
                ? 'Add more files'
                : documents.length
                  ? 'Add PDF or images'
                  : 'Attach PDF or images'
            }
            icon="cloud-upload"
            variant="secondary"
            size="md"
            onPress={onPickDocument}
            disabled={saving || documents.length + pendingDocs.length >= 5}
          />
        ) : null}
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

      {isOwner ? (
        <>
          <Button label="Save changes" icon="checkmark" loading={saving} onPress={onSave} />
          <Button
            label="Delete record"
            variant="danger"
            icon="trash"
            onPress={confirmDelete}
            disabled={saving}
          />
        </>
      ) : null}
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sharedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.half,
  },
  sharedBannerBody: {
    flex: 1,
    gap: Spacing.half,
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
  removeDocBtn: {
    padding: Spacing.one,
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
