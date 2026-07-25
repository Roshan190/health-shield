import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Overlay, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionStore } from '@/lib/auth/session-store';
import {
  loadEmergencyCardSnapshot,
  saveEmergencyCardSnapshot,
  type EmergencyCardSnapshot,
} from '@/lib/emergency/card-store';
import { formatDate } from '@/lib/policies/format';
import { getSupabase } from '@/lib/supabase/client';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="caption" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.fieldValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function EmergencyCardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useSessionStore((s) => s.user);
  const [card, setCard] = useState<EmergencyCardSnapshot | null>(null);
  const [source, setSource] = useState<'live' | 'offline' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cached = await loadEmergencyCardSnapshot();

    if (!user) {
      setCard(cached);
      setSource(cached ? 'offline' : null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: loadError } = await getSupabase()
        .from('profiles')
        .select(
          'full_name, date_of_birth, blood_group, emergency_contact_name, emergency_contact_phone'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (loadError) {
        throw loadError;
      }

      if (data) {
        const snapshot = await saveEmergencyCardSnapshot({
          fullName: data.full_name,
          dateOfBirth: data.date_of_birth,
          bloodGroup: data.blood_group,
          emergencyContactName: data.emergency_contact_name,
          emergencyContactPhone: data.emergency_contact_phone,
        });
        setCard(snapshot);
        setSource('live');
      } else if (cached) {
        setCard(cached);
        setSource('offline');
      } else {
        setCard(null);
        setSource(null);
      }
    } catch {
      if (cached) {
        setCard(cached);
        setSource('offline');
      } else {
        setError('Could not load emergency details. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const incomplete =
    !card?.fullName &&
    !card?.bloodGroup &&
    !card?.emergencyContactName &&
    !card?.emergencyContactPhone;

  return (
    <Screen
      title="Emergency card"
      subtitle="Show this to responders. Works offline once loaded.">
      {loading ? (
        <Card>
          <Skeleton width="100%" height={220} radius={Radius.xl} />
        </Card>
      ) : (
        <>
          <LinearGradient
            colors={['#7F1D1D', '#B91C1C', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.brandRow}>
                <Ionicons name="medkit" size={22} color={Overlay.onGradient} />
                <ThemedText type="smallBold" style={styles.brand}>
                  HealthShield · Emergency
                </ThemedText>
              </View>
              {source === 'offline' ? (
                <Chip label="Offline copy" tint="amber" icon="cloud-offline" />
              ) : (
                <Chip label="Ready" tint="green" icon="checkmark-circle" />
              )}
            </View>

            <ThemedText type="heading" style={styles.name} numberOfLines={2}>
              {card?.fullName?.trim() || 'Name not set'}
            </ThemedText>

            <View style={styles.grid}>
              <Field label="Blood group" value={card?.bloodGroup?.trim() || '—'} />
              <Field
                label="Date of birth"
                value={card?.dateOfBirth ? formatDate(card.dateOfBirth) : '—'}
              />
            </View>

            <View style={[styles.contactBlock, { backgroundColor: Overlay.glassBg }]}>
              <ThemedText type="caption" style={styles.fieldLabel}>
                Emergency contact
              </ThemedText>
              <ThemedText type="smallBold" style={styles.fieldValue}>
                {card?.emergencyContactName?.trim() || 'Not set'}
              </ThemedText>
              <ThemedText type="section" style={styles.phone}>
                {card?.emergencyContactPhone?.trim() || '—'}
              </ThemedText>
            </View>

            <ThemedText type="caption" style={styles.disclaimer}>
              Not a medical diagnosis tool. Share only what you choose to show.
            </ThemedText>
          </LinearGradient>

          {incomplete ? (
            <Card variant="muted" style={styles.noticeRow}>
              <Ionicons name="information-circle" size={18} color={theme.warning} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                Add your name, blood group, and emergency contact in Profile so responders see them
                here.
              </ThemedText>
            </Card>
          ) : null}

          {error ? (
            <Card variant="muted" style={styles.noticeRow}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={styles.noticeText}>
                {error}
              </ThemedText>
            </Card>
          ) : null}

          <Card variant="tinted" style={styles.tipCard}>
            <Ionicons name="phone-portrait-outline" size={20} color={theme.primary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.noticeText}>
              Open this screen before you lose signal — we keep a private copy on this device.
            </ThemedText>
          </Card>

          <Button label="Refresh card" icon="refresh" variant="secondary" onPress={load} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xxl,
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  brand: {
    color: Overlay.onGradient,
  },
  name: {
    color: Overlay.onGradient,
    fontSize: 28,
    lineHeight: 34,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  field: {
    flex: 1,
    gap: Spacing.half,
  },
  fieldLabel: {
    color: Overlay.onGradientFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldValue: {
    color: Overlay.onGradient,
    fontSize: 18,
  },
  contactBlock: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  phone: {
    color: Overlay.onGradient,
    marginTop: Spacing.one,
  },
  disclaimer: {
    color: Overlay.onGradientFaint,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
  },
});
