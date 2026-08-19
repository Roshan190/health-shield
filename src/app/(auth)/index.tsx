import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Overlay, Radius, Shadow, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignInScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    setError(null);
    const parsed = schema.safeParse({ email: email.trim(), password });
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
      const { error: signInError } = await getSupabase().auth.signInWithPassword(parsed.data);
      if (signInError) {
        setError(signInError.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      {/* ——— Brand hero ——— */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
        <View style={[styles.brandMarkWrap, Shadow.floating]}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMark}>
            <Ionicons name="shield-checkmark" size={40} color={Overlay.onGradient} />
          </LinearGradient>
        </View>
        <ThemedText type="title" style={styles.brandTitle}>
          HealthShield
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.brandTagline}>
          Your family’s health &amp; insurance, organized in one private place.
        </ThemedText>
      </Animated.View>

      {!isSupabaseConfigured ? (
        <Card variant="muted" style={styles.noticeRow}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
            Missing Supabase env. Copy `.env.example` to `.env`.
          </ThemedText>
        </Card>
      ) : null}

      {/* ——— Sign-in card ——— */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Card style={styles.formCard}>
          <ThemedText type="section">Welcome back</ThemedText>
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
          <TextField
            label="Password"
            icon="lock-closed"
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? (
            <View style={styles.noticeRow}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
                {error}
              </ThemedText>
            </View>
          ) : null}
          <Link href="/forgot-password" asChild>
            <Pressable accessibilityRole="link" disabled={loading} style={styles.forgotWrap}>
              <ThemedText type="small" themeColor="primary">
                Forgot password?
              </ThemedText>
            </Pressable>
          </Link>
          <Button label="Sign in" icon="log-in" loading={loading} onPress={onSignIn} />
          <Link href="/sign-up" asChild>
            <Button label="Create account" variant="secondary" disabled={loading} />
          </Link>
        </Card>
      </Animated.View>

      {/* ——— Trust footer ——— */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="lock-closed" size={15} color={theme.textTertiary} />
          <ThemedText type="caption" themeColor="textTertiary">
            Private storage
          </ThemedText>
        </View>
        <View style={[styles.trustDot, { backgroundColor: theme.textTertiary }]} />
        <View style={styles.trustItem}>
          <Ionicons name="phone-portrait" size={15} color={theme.textTertiary} />
          <ThemedText type="caption" themeColor="textTertiary">
            India-first
          </ThemedText>
        </View>
        <View style={[styles.trustDot, { backgroundColor: theme.textTertiary }]} />
        <View style={styles.trustItem}>
          <Ionicons name="people" size={15} color={theme.textTertiary} />
          <ThemedText type="caption" themeColor="textTertiary">
            Built for families
          </ThemedText>
        </View>
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
    width: 84,
    height: 84,
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
  forgotWrap: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: Radius.pill,
    opacity: 0.5,
  },
});
