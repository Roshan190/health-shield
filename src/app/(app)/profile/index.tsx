import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { Overlay, Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { deleteAccountCompletely, exportAccountData } from '@/lib/account/data-lifecycle';
import { useSessionStore } from '@/lib/auth/session-store';
import { saveEmergencyCardSnapshot } from '@/lib/emergency/card-store';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/database.types';
import { THEME_OPTIONS, useThemeStore } from '@/lib/theme/theme-store';

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')
    .or(z.literal('')),
  blood_group: z.string().trim(),
  emergency_contact_name: z.string().trim(),
  emergency_contact_phone: z.string().trim(),
});

function initialsOf(name: string | null, email: string | null | undefined) {
  const source = name?.trim() || email || '';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || '?';
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const gradients = useGradients();
  const user = useSessionStore((s) => s.user);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAccount, setBusyAccount] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    const { data, error: loadError } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(data);
      setFullName(data.full_name ?? '');
      setDateOfBirth(data.date_of_birth ?? '');
      setBloodGroup(data.blood_group ?? '');
      setEmergencyName(data.emergency_contact_name ?? '');
      setEmergencyPhone(data.emergency_contact_phone ?? '');
      void saveEmergencyCardSnapshot({
        fullName: data.full_name,
        dateOfBirth: data.date_of_birth,
        bloodGroup: data.blood_group,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
      });
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  async function onSave() {
    if (!user) {
      return;
    }
    setError(null);
    setStatus(null);

    const parsed = profileSchema.safeParse({
      full_name: fullName,
      date_of_birth: dateOfBirth,
      blood_group: bloodGroup,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid profile');
      return;
    }

    setSaving(true);
    const payload = {
      id: user.id,
      full_name: parsed.data.full_name,
      date_of_birth: parsed.data.date_of_birth || null,
      blood_group: parsed.data.blood_group || null,
      emergency_contact_name: parsed.data.emergency_contact_name || null,
      emergency_contact_phone: parsed.data.emergency_contact_phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await getSupabase().from('profiles').upsert(payload);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await saveEmergencyCardSnapshot({
      fullName: payload.full_name,
      dateOfBirth: payload.date_of_birth,
      bloodGroup: payload.blood_group,
      emergencyContactName: payload.emergency_contact_name,
      emergencyContactPhone: payload.emergency_contact_phone,
    });

    setStatus('Profile saved.');
    setProfile({ ...(profile ?? { id: user.id }), ...payload });
  }

  async function onSignOut() {
    setError(null);
    const { error: signOutError } = await getSupabase().auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
  }

  async function onExport() {
    if (!user) {
      return;
    }
    setBusyAccount(true);
    setError(null);
    setStatus(null);
    try {
      await exportAccountData(user.id);
      setStatus('Export ready — use the share sheet to save a copy.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusyAccount(false);
    }
  }

  function onDeleteAccount() {
    if (!user) {
      return;
    }
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, policies, records, family members, vitals, medications, synced health data, and uploaded documents. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm deletion', 'Are you sure? Export your data first if you need a copy.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, delete',
                style: 'destructive',
                onPress: async () => {
                  setBusyAccount(true);
                  setError(null);
                  try {
                    await deleteAccountCompletely(user.id);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not delete account');
                    setBusyAccount(false);
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  }

  const displayName = fullName || profile?.full_name || '';
  const initials = initialsOf(displayName || null, user?.email);

  return (
    <Screen title="Profile" subtitle="Your account and emergency basics.">
      {/* ——— Identity card ——— */}
      <Card style={styles.identityCard} padded={false}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityGradient}>
          <View style={styles.identityWatermark} pointerEvents="none">
            <Ionicons name="shield-checkmark" size={120} color={Overlay.glassBgStrong} />
          </View>

          <View style={styles.identityTop}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {loading ? (
                  <Skeleton width={36} height={36} radius={Radius.pill} />
                ) : (
                  <ThemedText type="heading" style={styles.avatarText}>
                    {initials}
                  </ThemedText>
                )}
              </View>
            </View>
            <View style={styles.identityMeta}>
              <ThemedText type="caption" style={styles.identityKicker}>
                HealthShield member
              </ThemedText>
              {loading ? (
                <Skeleton width="70%" height={22} />
              ) : (
                <ThemedText type="heading" style={styles.identityName} numberOfLines={1}>
                  {displayName || 'Add your name'}
                </ThemedText>
              )}
              <View style={styles.emailRow}>
                <Ionicons name="mail" size={13} color={Overlay.onGradientMuted} />
                <ThemedText type="caption" style={styles.identityEmail} numberOfLines={1}>
                  {user?.email ?? 'unknown'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.identityChips}>
            {bloodGroup ? (
              <View style={styles.glassChip}>
                <Ionicons name="water" size={14} color={Overlay.onGradient} />
                <ThemedText type="caption" style={styles.glassChipText}>
                  {bloodGroup}
                </ThemedText>
              </View>
            ) : null}
            {dateOfBirth ? (
              <View style={styles.glassChip}>
                <Ionicons name="calendar" size={14} color={Overlay.onGradient} />
                <ThemedText type="caption" style={styles.glassChipText}>
                  {formatDate(dateOfBirth)}
                </ThemedText>
              </View>
            ) : null}
            {!bloodGroup && !dateOfBirth ? (
              <View style={styles.glassChip}>
                <Ionicons name="create-outline" size={14} color={Overlay.onGradient} />
                <ThemedText type="caption" style={styles.glassChipText}>
                  Complete your details below
                </ThemedText>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Card>

      {loading ? (
        <Card>
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
          <Skeleton width="100%" height={48} radius={Radius.lg} />
        </Card>
      ) : (
        <>
          <Card style={styles.formCard}>
            <View style={styles.cardTitleRow}>
              <IconBadge icon="medkit" tint="red" size={34} />
              <ThemedText type="section">Emergency card</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              A clear card for responders. Cached on this device for offline use.
            </ThemedText>
            <Button
              label="Open emergency card"
              icon="medkit"
              variant="secondary"
              onPress={() => router.push('/profile/emergency')}
            />
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.cardTitleRow}>
              <IconBadge icon="person" tint="blue" size={34} />
              <ThemedText type="section">Personal details</ThemedText>
            </View>
            <TextField label="Full name" icon="person" value={fullName} onChangeText={setFullName} />
            <DateField
              label="Date of birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              maximumDate={new Date()}
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
              <IconBadge icon="color-palette" tint="violet" size={34} />
              <ThemedText type="section">Appearance</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Choose light, dark, or match your phone settings. Saved on this device.
            </ThemedText>
            <View style={styles.chips}>
              {THEME_OPTIONS.map((option) => (
                <SelectChip
                  key={option.value}
                  label={option.label}
                  selected={themePreference === option.value}
                  onPress={() => setThemePreference(option.value)}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.cardTitleRow}>
              <IconBadge icon="call" tint="red" size={34} />
              <ThemedText type="section">Emergency contact</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Shown on your emergency card so responders know who to call.
            </ThemedText>
            <TextField
              label="Contact name"
              icon="person"
              value={emergencyName}
              onChangeText={setEmergencyName}
            />
            <TextField
              label="Contact phone"
              icon="call"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
            />
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.cardTitleRow}>
              <IconBadge icon="shield" tint="slate" size={34} />
              <ThemedText type="section">Your data</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Export a JSON copy of your HealthShield data, or permanently delete your account
              (DPDP-minded).
            </ThemedText>
            <Chip label="Private by default" tint="slate" icon="lock-closed" />
            <Button
              label="Export my data"
              icon="download"
              variant="secondary"
              loading={busyAccount}
              onPress={onExport}
              disabled={saving}
            />
            <Button
              label="Delete account"
              icon="trash"
              variant="danger"
              onPress={onDeleteAccount}
              disabled={saving || busyAccount}
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

          <Button label="Save profile" icon="checkmark" loading={saving} onPress={onSave} />
          <Button
            label="Sign out"
            variant="secondary"
            icon="log-out"
            onPress={onSignOut}
            disabled={saving || busyAccount}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    gap: 0,
    overflow: 'hidden',
  },
  identityGradient: {
    padding: Spacing.four,
    gap: Spacing.three,
    minHeight: 168,
    overflow: 'hidden',
  },
  identityWatermark: {
    position: 'absolute',
    right: -20,
    bottom: -28,
    opacity: 0.55,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarRing: {
    padding: 3,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Overlay.glassBorder,
    backgroundColor: Overlay.glassBg,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    color: Overlay.onGradient,
    fontSize: 26,
  },
  identityMeta: {
    flex: 1,
    gap: Spacing.half,
  },
  identityKicker: {
    color: Overlay.onGradientFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  identityName: {
    color: Overlay.onGradient,
    fontSize: 24,
    lineHeight: 30,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  identityEmail: {
    color: Overlay.onGradientMuted,
    flex: 1,
  },
  identityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
    backgroundColor: Overlay.glassBg,
    borderWidth: 1,
    borderColor: Overlay.glassBorder,
  },
  glassChipText: {
    color: Overlay.onGradient,
  },
  formCard: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
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
