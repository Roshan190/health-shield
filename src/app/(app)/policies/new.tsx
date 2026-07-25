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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import { POLICY_TYPES, PREMIUM_FREQUENCIES } from '@/lib/policies/format';
import { pickPolicyPdf, uploadPolicyPdf, type PickedPdf } from '@/lib/policies/upload';
import { getSupabase } from '@/lib/supabase/client';
import type { PolicyType } from '@/lib/supabase/database.types';

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

export default function NewPolicyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);

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
  const [pdf, setPdf] = useState<PickedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onPickPdf() {
    setError(null);
    try {
      const picked = await pickPolicyPdf();
      if (picked) {
        setPdf(picked);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not pick PDF');
    }
  }

  async function onSave() {
    if (!user) {
      setError('Not signed in');
      return;
    }

    setError(null);
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
      const { data: created, error: insertError } = await getSupabase()
        .from('policies')
        .insert({
          user_id: user.id,
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
        })
        .select('*')
        .single();

      if (insertError || !created) {
        throw insertError ?? new Error('Could not create policy');
      }

      if (pdf) {
        const uploaded = await uploadPolicyPdf({
          userId: user.id,
          policyId: created.id,
          pdf,
        });
        const { error: updateError } = await getSupabase()
          .from('policies')
          .update({
            document_path: uploaded.path,
            document_name: uploaded.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', created.id);

        if (updateError) {
          throw updateError;
        }
      }

      router.replace(`/policies/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Add policy"
      subtitle="Type the details from your policy document."
      headerRight={<IconBadge icon="shield-checkmark" tint="blue" size={44} />}>
      {/* ——— Policy details ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-text" tint="blue" size={34} />
          <ThemedText type="section">Policy details</ThemedText>
        </View>
        <TextField
          label="Insurer *"
          icon="business"
          placeholder="e.g. HDFC ERGO"
          value={insurer}
          onChangeText={setInsurer}
        />
        <TextField
          label="Policy number *"
          icon="barcode"
          placeholder="As printed on the policy"
          value={policyNumber}
          onChangeText={setPolicyNumber}
          autoCapitalize="characters"
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
              disabled={saving}
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
          placeholder="e.g. 500000"
          value={sumInsured}
          onChangeText={setSumInsured}
          keyboardType="numeric"
        />
        <TextField
          label="Premium amount (INR)"
          icon="cash"
          placeholder="e.g. 12000"
          value={premiumAmount}
          onChangeText={setPremiumAmount}
          keyboardType="numeric"
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
              disabled={saving}
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
        />
        <DateField
          label="Renewal date"
          icon="alarm"
          value={renewalDate}
          onChange={setRenewalDate}
          hint="Renewals appear on Home 60 days ahead."
        />
        <TextField
          label="Nominee"
          icon="person"
          placeholder="Who is covered / nominated"
          value={nominee}
          onChangeText={setNominee}
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

      {/* ——— Document ——— */}
      <Card style={styles.formCard}>
        <View style={styles.cardTitleRow}>
          <IconBadge icon="document-attach" tint="amber" size={34} />
          <ThemedText type="section">Policy document</ThemedText>
        </View>
        {pdf ? (
          <View style={[styles.docRow, { backgroundColor: theme.surfaceMuted }]}>
            <IconBadge icon="document-text" tint="red" size={38} />
            <View style={styles.docBody}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {pdf.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Will upload to private storage on save
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Optional, but recommended — keep the original PDF safe with the policy.
          </ThemedText>
        )}
        <Button
          label={pdf ? 'Choose a different PDF' : 'Attach policy PDF'}
          icon="cloud-upload"
          variant="secondary"
          size="md"
          onPress={onPickPdf}
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

      <Button label="Save policy" icon="checkmark" loading={saving} onPress={onSave} />
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
