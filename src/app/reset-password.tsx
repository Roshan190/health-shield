import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Overlay, Radius, Shadow, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { persistPasswordRecoveryFlag, revokeOtherSessions } from '@/lib/auth/password-recovery';
import { useSessionStore } from '@/lib/auth/session-store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const session = useSessionStore((s) => s.session);
  const recoveryError = useSessionStore((s) => s.recoveryError);
  const setPasswordRecovery = useSessionStore((s) => s.setPasswordRecovery);
  const setRecoveryError = useSessionStore((s) => s.setRecoveryError);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const exchanging = Boolean(!session && !recoveryError);

  async function abandonRecovery() {
    setLeaving(true);
    setPasswordRecovery(false);
    setRecoveryError(null);
    await persistPasswordRecoveryFlag(false);
    if (isSupabaseConfigured) {
      await getSupabase().auth.signOut();
    }
  }

  async function onSave() {
    setError(null);
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add keys to `.env`.');
      return;
    }
    if (!session) {
      setError('This reset link is invalid or already used.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({
        password: parsed.data.password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await revokeOtherSessions();
      setPasswordRecovery(false);
      await persistPasswordRecoveryFlag(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
        <View style={[styles.brandMarkWrap, Shadow.floating]}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMark}>
            <Ionicons name="lock-closed" size={34} color={Overlay.onGradient} />
          </LinearGradient>
        </View>
        <ThemedText type="subtitle" style={styles.brandTitle}>
          Choose a new password
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.brandTagline}>
          This updates the password for the HealthShield app and the doctor portal.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Card style={styles.formCard}>
          {exchanging ? (
            <View style={styles.noticeRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                Opening your reset link…
              </ThemedText>
            </View>
          ) : null}

          {recoveryError ? (
            <View style={styles.noticeRow}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
                {recoveryError}
              </ThemedText>
            </View>
          ) : null}

          {session && !recoveryError ? (
            <>
              <TextField
                label="New password"
                icon="lock-closed"
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Min 8 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextField
                label="Confirm password"
                icon="lock-closed"
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Repeat new password"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
              {error ? (
                <View style={styles.noticeRow}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}
              <Button label="Save password" icon="checkmark" loading={loading} onPress={onSave} />
            </>
          ) : null}

          <Button
            label="Request a new link"
            variant="ghost"
            disabled={loading || leaving}
            onPress={() => void abandonRecovery()}
          />
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  brandMarkWrap: {
    borderRadius: Radius.xxl,
    marginBottom: Spacing.two,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    textAlign: 'center',
  },
  brandTagline: {
    textAlign: 'center',
    maxWidth: 280,
  },
  formCard: {
    gap: Spacing.three,
    padding: Spacing.four,
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
