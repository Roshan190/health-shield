import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
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
import { Overlay, Radius, Shadow, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { SummarizeError, summarizeItem } from '@/lib/ai/summarize';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  CASHLESS_ASSIST_DISCLAIMER,
  matchInsurerNetwork,
} from '@/lib/hospitals/insurers';
import {
  formatDate,
  formatInr,
  POLICY_TYPES,
  PREMIUM_FREQUENCIES,
  renewalLabel,
  renewalTone,
} from '@/lib/policies/format';
import { policyVisual, RENEWAL_TONE_TINT } from '@/lib/policies/visuals';
import {
  createSignedPolicyUrl,
  deletePolicyPdf,
  pickPolicyPdf,
  uploadPolicyPdf,
  type PickedPdf,
} from '@/lib/policies/upload';
import { getSupabase } from '@/lib/supabase/client';
import type { FamilyMember, Policy, PolicyType } from '@/lib/supabase/database.types';

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')
  .or(z.literal(''));

const schema = z.object({
  insurer: z.string().trim().min(1, 'Insurer is required'),
  policy_number: z.string().trim().min(1, 'Policy number is required'),
  policy_type: z.enum([
    'health',
    'term',
    'life',
    'personal_accident',
    'critical_illness',
    'other',
  ]),
  sum_insured: z.string().trim(),
  premium_amount: z.string().trim(),
  premium_frequency: z.string().trim(),
  start_date: optionalDate,
  renewal_date: optionalDate,
  nominee: z.string().trim(),
  notes: z.string().trim(),
});

function parseAmount(value: string) {
  if (!value) {
    return null;
  }
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isPolicyFormDirty(
  policy: Policy,
  fields: {
    insurer: string;
    policyNumber: string;
    policyType: PolicyType;
    sumInsured: string;
    premiumAmount: string;
    premiumFrequency: string;
    startDate: string;
    renewalDate: string;
    nominee: string;
    notes: string;
    familyMemberId: string | null;
    pendingPdf: PickedPdf | null;
  }
) {
  if (fields.pendingPdf) {
    return true;
  }
  return (
    fields.insurer !== policy.insurer ||
    fields.policyNumber !== policy.policy_number ||
    fields.policyType !== policy.policy_type ||
    parseAmount(fields.sumInsured) !== policy.sum_insured ||
    parseAmount(fields.premiumAmount) !== policy.premium_amount ||
    (fields.premiumFrequency || 'annual') !== (policy.premium_frequency ?? 'annual') ||
    (fields.startDate || null) !== policy.start_date ||
    (fields.renewalDate || null) !== policy.renewal_date ||
    (fields.nominee.trim() || null) !== policy.nominee ||
    (fields.notes.trim() || null) !== policy.notes ||
    fields.familyMemberId !== policy.family_member_id
  );
}

export default function PolicyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const gradients = useGradients();
  const user = useSessionStore((s) => s.user);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyType, setPolicyType] = useState<PolicyType>('health');
  const [sumInsured, setSumInsured] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [nominee, setNominee] = useState('');
  const [notes, setNotes] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingPdf, setPendingPdf] = useState<PickedPdf | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryDisclaimer, setSummaryDisclaimer] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const hydrate = useCallback((row: Policy) => {
    setPolicy(row);
    setInsurer(row.insurer);
    setPolicyNumber(row.policy_number);
    setPolicyType(row.policy_type);
    setSumInsured(row.sum_insured != null ? String(row.sum_insured) : '');
    setPremiumAmount(row.premium_amount != null ? String(row.premium_amount) : '');
    setPremiumFrequency(row.premium_frequency ?? 'annual');
    setStartDate(row.start_date ?? '');
    setRenewalDate(row.renewal_date ?? '');
    setNominee(row.nominee ?? '');
    setNotes(row.notes ?? '');
    setFamilyMemberId(row.family_member_id);
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const [policyRes, membersRes] = await Promise.all([
      getSupabase().from('policies').select('*').eq('id', id).maybeSingle(),
      getSupabase().from('family_members').select('*').order('full_name', { ascending: true }),
    ]);

    setMembers(membersRes.data ?? []);

    if (policyRes.error) {
      setError(policyRes.error.message);
    } else if (!policyRes.data) {
      setError('Policy not found');
    } else {
      hydrate(policyRes.data);
      setError(null);
    }
    setLoading(false);
  }, [hydrate, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onPickPdf() {
    setError(null);
    try {
      const picked = await pickPolicyPdf();
      if (picked) {
        setPendingPdf(picked);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pick PDF');
    }
  }

  async function onOpenPdf() {
    if (!policy?.document_path) {
      return;
    }
    try {
      const url = await createSignedPolicyUrl(policy.document_path);
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open PDF');
    }
  }

  async function onSave() {
    if (!user || !policy) {
      return;
    }
    setError(null);
    setStatus(null);

    const parsed = schema.safeParse({
      insurer,
      policy_number: policyNumber,
      policy_type: policyType,
      sum_insured: sumInsured,
      premium_amount: premiumAmount,
      premium_frequency: premiumFrequency,
      start_date: startDate,
      renewal_date: renewalDate,
      nominee,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    const sum = parseAmount(parsed.data.sum_insured);
    const premium = parseAmount(parsed.data.premium_amount);
    if (parsed.data.sum_insured && sum == null) {
      setError('Sum insured must be a number');
      return;
    }
    if (parsed.data.premium_amount && premium == null) {
      setError('Premium must be a number');
      return;
    }

    setSaving(true);
    try {
      let documentPath = policy.document_path;
      let documentName = policy.document_name;

      if (pendingPdf) {
        const uploaded = await uploadPolicyPdf({
          userId: user.id,
          policyId: policy.id,
          pdf: pendingPdf,
          previousPath: policy.document_path,
        });
        documentPath = uploaded.path;
        documentName = uploaded.name;
        setPendingPdf(null);
      }

      const { data, error: updateError } = await getSupabase()
        .from('policies')
        .update({
          insurer: parsed.data.insurer,
          policy_number: parsed.data.policy_number,
          policy_type: parsed.data.policy_type,
          sum_insured: sum,
          premium_amount: premium,
          premium_frequency: parsed.data.premium_frequency || null,
          start_date: parsed.data.start_date || null,
          renewal_date: parsed.data.renewal_date || null,
          nominee: parsed.data.nominee || null,
          notes: parsed.data.notes || null,
          family_member_id: familyMemberId,
          document_path: documentPath,
          document_name: documentName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id)
        .select('*')
        .single();

      if (updateError || !data) {
        throw updateError ?? new Error('Update failed');
      }

      hydrate(data);
      setStatus('Policy saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete policy?', 'This removes the policy and its PDF from HealthShield.', [
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
    if (!policy) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (policy.document_path) {
        await deletePolicyPdf(policy.document_path);
      }
      const { error: deleteError } = await getSupabase()
        .from('policies')
        .delete()
        .eq('id', policy.id);
      if (deleteError) {
        throw deleteError;
      }
      router.replace('/policies');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setSaving(false);
    }
  }

  async function onSummarize() {
    if (!policy) {
      return;
    }
    if (
      isPolicyFormDirty(policy, {
        insurer,
        policyNumber,
        policyType,
        sumInsured,
        premiumAmount,
        premiumFrequency,
        startDate,
        renewalDate,
        nominee,
        notes,
        familyMemberId,
        pendingPdf,
      })
    ) {
      Alert.alert('Save changes first', 'Summarize uses the last saved policy details, not unsaved edits.');
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    try {
      const result = await summarizeItem('policy', policy.id);
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
      <Screen title="Policy">
        <Card>
          <Skeleton width="50%" height={20} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="35%" height={26} />
        </Card>
        <Card>
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      </Screen>
    );
  }

  if (!policy) {
    return (
      <Screen title="Policy">
        <Card style={styles.notFoundCard}>
          <IconBadge icon="alert-circle" tint="red" size={46} shape="circle" />
          <ThemedText type="smallBold">{error ?? 'Policy not found'}</ThemedText>
        </Card>
        <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const visual = policyVisual(policy.policy_type);
  const tone = renewalTone(policy.renewal_date);
  const isOwner = Boolean(user && policy.user_id === user.id);
  const cashlessMatch = matchInsurerNetwork(insurer);

  return (
    <Screen
      title={policy.insurer}
      subtitle={
        isOwner
          ? `Policy № ${policy.policy_number}`
          : `Shared with you · № ${policy.policy_number}`
      }>
      {!isOwner ? (
        <Card variant="tinted" style={styles.sharedBanner}>
          <IconBadge icon="eye" tint="teal" size={34} />
          <View style={styles.sharedBannerBody}>
            <ThemedText type="smallBold">Shared view</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              You can view this policy. Only the owner can edit or share it.
            </ThemedText>
          </View>
        </Card>
      ) : null}

      {/* ——— Summary hero ——— */}
      <View style={[styles.heroWrap, Shadow.floating]}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name={visual.icon} size={24} color={Overlay.onGradient} />
            </View>
            <Chip
              label={renewalLabel(policy.renewal_date)}
              tint={RENEWAL_TONE_TINT[tone]}
              icon={tone === 'muted' ? 'calendar' : 'alarm'}
            />
          </View>
          <View style={styles.heroCover}>
            <ThemedText type="label" style={styles.heroLabel}>
              Sum insured
            </ThemedText>
            <ThemedText type="title" style={styles.heroValue}>
              {formatInr(policy.sum_insured)}
            </ThemedText>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMeta}>
              <ThemedText type="label" style={styles.heroLabel}>
                Premium
              </ThemedText>
              <ThemedText type="smallBold" style={styles.heroMetaValue}>
                {formatInr(policy.premium_amount)}
                {policy.premium_frequency ? ` / ${policy.premium_frequency.replace('_', ' ')}` : ''}
              </ThemedText>
            </View>
            <View style={styles.heroMeta}>
              <ThemedText type="label" style={styles.heroLabel}>
                Started
              </ThemedText>
              <ThemedText type="smallBold" style={styles.heroMetaValue}>
                {formatDate(policy.start_date)}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
      </View>

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

      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="link" tint="blue" size={34} />
          <View style={styles.cashlessCopy}>
            <ThemedText type="section">Cashless hospitals</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {CASHLESS_ASSIST_DISCLAIMER}
            </ThemedText>
          </View>
        </View>
        {cashlessMatch ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Opens {cashlessMatch.canonicalName}’s official network hospital tool
              {cashlessMatch.helpline ? ` · Helpline ${cashlessMatch.helpline}` : ''}.
            </ThemedText>
            <Button
              label="Open insurer network"
              icon="open-outline"
              variant="secondary"
              onPress={() => {
                void Linking.openURL(cashlessMatch.networkHospitalsUrl);
              }}
              disabled={saving}
            />
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No curated link for this insurer name yet. Use Hospitals → Cashless after saving, or
            search the insurer’s official website.
          </ThemedText>
        )}
        <Button
          label="Open Hospitals hub"
          icon="business"
          variant="ghost"
          onPress={() => router.push('/hospitals' as Href)}
          disabled={saving}
        />
      </Card>

      {isOwner ? (
        <VaultItemShareCard
          ownerUserId={policy.user_id}
          resourceType="policy"
          resourceId={policy.id}
        />
      ) : null}
      {/* ——— Policy details ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-text" tint="blue" size={34} />
          <ThemedText type="section">Policy details</ThemedText>
        </View>
        <TextField
          label="Insurer"
          icon="business"
          value={insurer}
          onChangeText={setInsurer}
          editable={isOwner}
        />
        <TextField
          label="Policy number"
          icon="barcode"
          value={policyNumber}
          onChangeText={setPolicyNumber}
          autoCapitalize="characters"
          editable={isOwner}
        />
        <ThemedText type="smallBold" themeColor="textSecondary">
          Type
        </ThemedText>
        <View style={styles.chips}>
          {POLICY_TYPES.map((type) => (
            <SelectChip
              key={type.value}
              label={type.label}
              selected={policyType === type.value}
              onPress={() => setPolicyType(type.value)}
              disabled={saving || !isOwner}
            />
          ))}
        </View>
      </Card>

      {/* ——— Coverage & premium ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="wallet" tint="teal" size={34} />
          <ThemedText type="section">Coverage &amp; premium</ThemedText>
        </View>
        <TextField
          label="Sum insured (INR)"
          icon="shield-checkmark"
          value={sumInsured}
          onChangeText={setSumInsured}
          keyboardType="numeric"
          editable={isOwner}
        />
        <TextField
          label="Premium amount (INR)"
          icon="cash"
          value={premiumAmount}
          onChangeText={setPremiumAmount}
          keyboardType="numeric"
          editable={isOwner}
        />
        <ThemedText type="smallBold" themeColor="textSecondary">
          Premium frequency
        </ThemedText>
        <View style={styles.chips}>
          {PREMIUM_FREQUENCIES.map((freq) => (
            <SelectChip
              key={freq}
              label={freq.replace('_', ' ')}
              selected={premiumFrequency === freq}
              onPress={() => setPremiumFrequency(freq)}
              disabled={saving || !isOwner}
            />
          ))}
        </View>
      </Card>

      {/* ——— Dates & nominee ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="calendar" tint="violet" size={34} />
          <ThemedText type="section">Dates &amp; nominee</ThemedText>
        </View>
        <DateField
          label="Start date"
          icon="play"
          value={startDate}
          onChange={setStartDate}
          disabled={!isOwner}
        />
        <DateField
          label="Renewal date"
          icon="alarm"
          value={renewalDate}
          onChange={setRenewalDate}
          hint="Renewals appear on Home 60 days ahead."
          disabled={!isOwner}
        />
        <FamilyMemberPicker
          members={members}
          value={familyMemberId}
          onChange={setFamilyMemberId}
          disabled={saving || !isOwner}
          label="Covered member"
          hint="Optional. Who this policy primarily covers in your household."
          emptyHint="Add someone under Family to link cover to them. Profiles stay on your account — they do not get a separate login yet."
        />
        <TextField
          label="Nominee"
          icon="person"
          value={nominee}
          onChangeText={setNominee}
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

      {/* ——— Document ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-attach" tint="amber" size={34} />
          <ThemedText type="section">Policy document</ThemedText>
        </View>
        {policy.document_path ? (
          <View style={[styles.docRow, { backgroundColor: theme.surfaceMuted }]}>
            <IconBadge icon="document-text" tint="red" size={38} />
            <View style={styles.docBody}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {policy.document_name ?? 'Policy PDF'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Stored in private, encrypted storage
              </ThemedText>
            </View>
            <Button label="Open" size="sm" variant="secondary" onPress={onOpenPdf} disabled={saving} />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No PDF attached yet. Keep the original policy document safe here.
          </ThemedText>
        )}
        {isOwner ? (
          <Button
            label={
              pendingPdf
                ? `Replace with: ${pendingPdf.name}`
                : policy.document_path
                  ? 'Replace PDF'
                  : 'Attach policy PDF'
            }
            icon="cloud-upload"
            variant="secondary"
            size="md"
            onPress={onPickPdf}
            disabled={saving}
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
            label="Delete policy"
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
  heroWrap: {
    borderRadius: Radius.xxl,
  },
  hero: {
    borderRadius: Radius.xxl,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Overlay.glassBgStrong,
  },
  heroCover: {
    gap: Spacing.one,
  },
  heroLabel: {
    color: Overlay.onGradientFaint,
  },
  heroValue: {
    color: Overlay.onGradient,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  heroMeta: {
    gap: Spacing.half,
    flex: 1,
  },
  heroMetaValue: {
    color: Overlay.onGradient,
  },
  formCard: {
    gap: Spacing.three,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  cashlessCopy: {
    flex: 1,
    gap: Spacing.half,
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
