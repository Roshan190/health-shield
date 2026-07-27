import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { PressableCard } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Overlay,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadEmergencyCardSnapshot } from '@/lib/emergency/card-store';
import { loadSosSession } from '@/lib/emergency/sos-session';

const SOS_GRADIENT = ['#7F1D1D', '#B91C1C', '#DC2626'] as const;

export default function EmergencyHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [sosActive, setSosActive] = useState(false);
  const [hasContact, setHasContact] = useState(false);
  const [contactLabel, setContactLabel] = useState<string | null>(null);

  const pulse = useSharedValue(1);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [session, card] = await Promise.all([
          loadSosSession(),
          loadEmergencyCardSnapshot(),
        ]);
        if (!active) {
          return;
        }
        setSosActive(session.active);
        const phone = card?.emergencyContactPhone?.trim();
        setHasContact(Boolean(phone));
        setContactLabel(
          [card?.emergencyContactName?.trim(), phone].filter(Boolean).join(' · ') || null
        );
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    if (sosActive) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false
      );
      return;
    }
    pulse.value = withTiming(1, { duration: 200 });
  }, [sosActive, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[...SOS_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.heroInner}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backChip}>
              <Ionicons name="chevron-back" size={20} color={Overlay.onGradient} />
              <ThemedText type="smallBold" style={styles.backLabel}>
                Back
              </ThemedText>
            </Pressable>

            <ThemedText type="small" style={styles.heroKicker}>
              Emergency
            </ThemedText>
            <ThemedText type="title" style={styles.heroTitle}>
              Get help fast
            </ThemedText>
            <ThemedText type="small" style={styles.heroSub}>
              Share your location with people you choose. We never call emergency services for you.
            </ThemedText>

            <Animated.View entering={FadeInDown.duration(450)} style={styles.sosWrap}>
              <Animated.View style={pulseStyle}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sosActive ? 'Open active SOS' : 'Start SOS'}
                  onPress={() => router.push('/emergency/sos')}
                  style={({ pressed }) => [
                    styles.sosButton,
                    Shadow.floating,
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}>
                  <View style={styles.sosRing}>
                    <ThemedText type="title" style={styles.sosLabel}>
                      SOS
                    </ThemedText>
                    <ThemedText type="caption" style={styles.sosHint}>
                      {sosActive ? 'Session active — tap to open' : 'Tap to start'}
                    </ThemedText>
                  </View>
                </Pressable>
              </Animated.View>
              {sosActive ? (
                <Chip label="Live session" tint="amber" icon="radio-button-on" />
              ) : (
                <ThemedText type="caption" style={styles.heroFoot}>
                  Nothing is sent until you confirm and tap Send
                </ThemedText>
              )}
            </Animated.View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <View
              style={[
                styles.statusStrip,
                Shadow.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <IconBadge
                icon={hasContact ? 'call' : 'person-add'}
                tint={hasContact ? 'green' : 'amber'}
                size={40}
              />
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {hasContact ? 'Emergency contact ready' : 'Add a contact for SMS'}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                  {contactLabel ?? 'Share still works without a phone number.'}
                </ThemedText>
              </View>
              {!hasContact ? (
                <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Add
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(140)}>
            <PressableCard
              style={styles.linkCard}
              onPress={() => router.push('/emergency/hospitals')}>
              <IconBadge icon="medkit" tint="teal" size={48} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Nearby hospitals</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Find hospitals near you and mark preferred ones.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </PressableCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(180)}>
            <PressableCard
              style={styles.linkCard}
              onPress={() => router.push('/profile/emergency')}>
              <IconBadge icon="card" tint="amber" size={48} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Show emergency card</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Offline-ready card for responders nearby.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </PressableCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(220)}>
            <PressableCard style={styles.linkCard} onPress={() => router.push('/profile')}>
              <IconBadge icon="create" tint="blue" size={48} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Edit emergency details</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Name, blood group, and who to reach.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </PressableCard>
          </Animated.View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingBottom: Spacing.six,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.two,
  },
  backChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.one,
    paddingRight: Spacing.two,
  },
  backLabel: {
    color: Overlay.onGradient,
  },
  heroKicker: {
    color: Overlay.onGradientFaint,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: Overlay.onGradient,
  },
  heroSub: {
    color: Overlay.onGradientMuted,
    maxWidth: 340,
  },
  sosWrap: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  sosButton: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: Overlay.glassBgStrong,
    borderWidth: 2,
    borderColor: Overlay.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: Overlay.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  sosLabel: {
    color: Overlay.onGradient,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: 2,
  },
  sosHint: {
    color: Overlay.onGradientFaint,
  },
  heroFoot: {
    color: Overlay.onGradientFaint,
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.two + Spacing.half,
    marginTop: -Spacing.four,
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
