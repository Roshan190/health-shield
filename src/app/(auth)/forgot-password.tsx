import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Overlay, Radius, Shadow, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import {
  APP_PASSWORD_RESET_REDIRECT,
  GENERIC_RESET_SENT,
  isAuthRateLimit,
  isRedirectAllowListError,
} from '@/lib/auth/password-recovery';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const schema = z.object({
  email: z.email('Enter a valid email'),
});

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = schema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add keys to `.env`.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: APP_PASSWORD_RESET_REDIRECT,
      });
      if (resetError) {
        if (isAuthRateLimit(resetError.message)) {
          setError('Too many attempts. Try again in a few minutes.');
          return;
        }
        if (isRedirectAllowListError(resetError.message)) {
          setError('Password reset is not fully configured yet.');
          return;
        }
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email');
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
            <Ionicons name="key" size={34} color={Overlay.onGradient} />
          </LinearGradient>
        </View>
        <ThemedText type="subtitle" style={styles.brandTitle}>
          Reset your password
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.brandTagline}>
          We’ll email a link if this address has a HealthShield account.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Card style={styles.formCard}>
          {sent ? (
            <>
              <View style={styles.noticeRow}>
                <Ionicons name="mail-unread" size={16} color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                  {GENERIC_RESET_SENT}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textTertiary">
                Open the link on this phone. Expo Go is not supported — use the HealthShield app.
              </ThemedText>
            </>
          ) : (
            <>
              <TextField
                label="Email"
                icon="mail"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
              />
              {error ? (
                <View style={styles.noticeRow}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}
              <Button label="Send reset link" icon="send" loading={loading} onPress={onSubmit} />
            </>
          )}
          <Link href="/" asChild>
            <Button label="Back to sign in" variant="ghost" disabled={loading} />
          </Link>
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
