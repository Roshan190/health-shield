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
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignUpScreen() {
  const theme = useTheme();
  const gradients = useGradients();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignUp() {
    setError(null);
    setInfo(null);
    const parsed = schema.safeParse({
      fullName,
      email: email.trim(),
      password,
    });
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
      const { data, error: signUpError } = await getSupabase().auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setInfo('Check your email to confirm your account, then sign in.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
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
            <Ionicons name="person-add" size={34} color={Overlay.onGradient} />
          </LinearGradient>
        </View>
        <ThemedText type="subtitle" style={styles.brandTitle}>
          Create your account
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.brandTagline}>
          Email and password. Profile details come next.
        </ThemedText>
      </Animated.View>

      {/* ——— Sign-up card ——— */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Card style={styles.formCard}>
          <TextField
            label="Full name"
            icon="person"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
          />
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
            autoComplete="new-password"
            placeholder="Min 8 characters"
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
          {info ? (
            <View style={styles.noticeRow}>
              <Ionicons name="mail-unread" size={16} color={theme.primary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                {info}
              </ThemedText>
            </View>
          ) : null}
          <Button
            label="Create account"
            icon="sparkles"
            loading={loading}
            onPress={onSignUp}
          />
          <Link href="/" asChild>
            <Button label="Back to sign in" variant="ghost" disabled={loading} />
          </Link>
        </Card>
      </Animated.View>

      {/* ——— Trust note ——— */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.trustRow}>
        <Ionicons name="lock-closed" size={14} color={theme.textTertiary} />
        <ThemedText type="caption" themeColor="textTertiary" style={styles.trustText}>
          Your data stays private — stored securely, visible only to you.
        </ThemedText>
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
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  trustText: {
    textAlign: 'center',
  },
});
