import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { LocationSubscription } from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { IconBadge } from '@/components/icon-badge';
import { Skeleton } from '@/components/skeleton';
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
import {
  loadEmergencyCardSnapshot,
  type EmergencyCardSnapshot,
} from '@/lib/emergency/card-store';
import {
  ensureForegroundLocationPermission,
  formatCoords,
  getCurrentSosCoords,
  mapsLinkForCoords,
  watchSosLocation,
} from '@/lib/emergency/location';
import { buildSosMessage, sendSosSms, shareSosMessage } from '@/lib/emergency/notify';
import {
  endSosSession,
  loadSosSession,
  markSosNotified,
  startSosSession,
  updateSosCoords,
  type SosSession,
} from '@/lib/emergency/sos-session';

const SOS_GRADIENT = ['#7F1D1D', '#B91C1C', '#DC2626'] as const;

export default function SosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const watchRef = useRef<LocationSubscription | null>(null);
  const pulse = useSharedValue(1);

  const [session, setSession] = useState<SosSession | null>(null);
  const [card, setCard] = useState<EmergencyCardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const active = Boolean(session?.active);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const startWatch = useCallback(async () => {
    stopWatch();
    const sub = await watchSosLocation(async (coords) => {
      const next = await updateSosCoords(coords);
      setSession(next);
    });
    watchRef.current = sub;
  }, [stopWatch]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextSession, nextCard] = await Promise.all([
      loadSosSession(),
      loadEmergencyCardSnapshot(),
    ]);
    setSession(nextSession);
    setCard(nextCard);
    setLoading(false);
    if (nextSession.active) {
      void startWatch();
    } else {
      stopWatch();
    }
  }, [startWatch, stopWatch]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        stopWatch();
      };
    }, [refresh, stopWatch])
  );

  useEffect(() => {
    return () => {
      stopWatch();
    };
  }, [stopWatch]);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
        false
      );
      return;
    }
    pulse.value = withTiming(1, { duration: 200 });
  }, [active, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  async function onConfirmStart() {
    setBusy(true);
    setError(null);
    setNote(null);

    const permission = await ensureForegroundLocationPermission();
    let coords = null;
    if (permission.ok) {
      coords = await getCurrentSosCoords();
      if (!coords) {
        setNote('Could not read GPS yet — you can still notify contacts without a pin.');
      }
    } else {
      setError(permission.message);
    }

    const next = await startSosSession(coords);
    setSession(next);
    if (permission.ok) {
      await startWatch();
    }
    setBusy(false);
  }

  function promptStart() {
    Alert.alert(
      'Start SOS?',
      'Next you can open SMS or Share with your location. Nothing is sent until you tap Send. HealthShield does not call 112/108 for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => void onConfirmStart() },
      ]
    );
  }

  async function onSms() {
    if (!session?.active) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    const message = buildSosMessage({ card, coords: session.lastCoords });
    const result = await sendSosSms({
      phone: card?.emergencyContactPhone,
      message,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'SMS failed');
      return;
    }
    const next = await markSosNotified();
    setSession(next);
    setNote('SMS composer opened. Confirm Send in your messaging app.');
  }

  async function onShare() {
    if (!session?.active) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    const message = buildSosMessage({ card, coords: session.lastCoords });
    const result = await shareSosMessage(message);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Share failed');
      return;
    }
    const next = await markSosNotified();
    setSession(next);
    setNote('Share sheet opened. Confirm send in the app you choose.');
  }

  function promptEnd() {
    Alert.alert(
      'End SOS?',
      'Stops live location updates in the app. Messages already sent are not recalled.',
      [
        { text: 'Keep active', style: 'cancel' },
        { text: 'End SOS', style: 'destructive', onPress: () => void onEnd() },
      ]
    );
  }

  async function onEnd() {
    setBusy(true);
    stopWatch();
    const next = await endSosSession();
    setSession(next);
    setBusy(false);
    router.replace('/emergency');
  }

  const coords = session?.lastCoords ?? null;
  const contactLine =
    [card?.emergencyContactName?.trim(), card?.emergencyContactPhone?.trim()]
      .filter(Boolean)
      .join(' · ') || 'No phone set — Share still works';

  return (
    <ThemedView style={styles.root}>
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
            <ThemedText type="smallBold" style={styles.onGradient}>
              Back
            </ThemedText>
          </Pressable>

          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <ThemedText type="small" style={styles.kicker}>
                {active ? 'Live SOS' : 'SOS'}
              </ThemedText>
              <ThemedText type="title" style={styles.onGradient}>
                {active ? 'Help is ready to send' : 'Share your location'}
              </ThemedText>
              <ThemedText type="small" style={styles.heroSub}>
                {active
                  ? 'Open SMS or Share — nothing leaves until you tap Send.'
                  : 'Confirm first. Foreground location only. Not a dispatch service.'}
              </ThemedText>
            </View>
            {active ? (
              <Animated.View style={[styles.liveDotWrap, pulseStyle]}>
                <View style={styles.liveDot} />
              </Animated.View>
            ) : null}
          </View>

          {loading || !session ? (
            <View style={styles.heroSkeleton}>
              <Skeleton width={120} height={120} radius={60} />
            </View>
          ) : !active ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.idleCta}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start SOS"
                disabled={busy}
                onPress={promptStart}
                style={({ pressed }) => [
                  styles.bigSos,
                  Shadow.floating,
                  { opacity: busy ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}>
                <ThemedText type="title" style={styles.bigSosLabel}>
                  SOS
                </ThemedText>
                <ThemedText type="caption" style={styles.bigSosHint}>
                  Tap to confirm
                </ThemedText>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(350)} style={styles.activeBadges}>
              <Chip
                label={session.notifiedAt ? 'Composer opened' : 'Waiting to notify'}
                tint={session.notifiedAt ? 'amber' : 'slate'}
                icon={session.notifiedAt ? 'chatbubble' : 'time'}
              />
              {session.startedAt ? (
                <ThemedText type="caption" style={styles.onGradientFaint}>
                  Started{' '}
                  {new Date(session.startedAt).toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </ThemedText>
              ) : null}
            </Animated.View>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        {loading || !session ? (
          <Card>
            <Skeleton width="70%" height={16} />
            <Skeleton width="100%" height={72} radius={Radius.lg} />
          </Card>
        ) : !active ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stack}>
            <View
              style={[
                styles.panel,
                Shadow.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">How it works</ThemedText>
              <Step n="1" label="Confirm SOS" />
              <Step n="2" label="Allow location if asked" />
              <Step n="3" label="Open SMS or Share" />
              <Step n="4" label="You tap Send" />
            </View>

            <View
              style={[
                styles.panel,
                Shadow.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <View style={styles.row}>
                <IconBadge icon="call" tint="violet" size={40} />
                <View style={styles.flex}>
                  <ThemedText type="caption" themeColor="textTertiary">
                    Emergency contact
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {contactLine}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Button
              label={busy ? 'Starting…' : 'I understand — start SOS'}
              icon="alert"
              loading={busy}
              onPress={promptStart}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => router.back()}
              disabled={busy}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stack}>
            <View
              style={[
                styles.panel,
                Shadow.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <View style={styles.row}>
                <IconBadge icon="navigate" tint="teal" size={46} />
                <View style={styles.flex}>
                  <ThemedText type="caption" themeColor="textTertiary">
                    Live location
                  </ThemedText>
                  {coords ? (
                    <>
                      <ThemedText type="smallBold">{formatCoords(coords)}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        {mapsLinkForCoords(coords)}
                      </ThemedText>
                      {coords.accuracy != null ? (
                        <ThemedText type="caption" themeColor="textTertiary">
                          ~{Math.round(coords.accuracy)} m ·{' '}
                          {new Date(coords.updatedAt).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      ) : null}
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Waiting for GPS… You can still notify without a pin.
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>

            <View
              style={[
                styles.panel,
                Shadow.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">Notify</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Opens your messaging app with a prefilled message.
              </ThemedText>
              <Button
                label="Text emergency contact"
                icon="chatbubble-ellipses"
                loading={busy}
                onPress={onSms}
              />
              <Button
                label="Share message"
                variant="secondary"
                icon="share-outline"
                loading={busy}
                onPress={onShare}
              />
            </View>

            <Button
              label="End SOS"
              variant="danger"
              icon="stop"
              disabled={busy}
              onPress={promptEnd}
            />
          </Animated.View>
        )}

        {error ? (
          <Card variant="muted" style={styles.notice}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <ThemedText type="small" themeColor="danger" style={styles.flex}>
              {error}
            </ThemedText>
          </Card>
        ) : null}
        {note ? (
          <Card variant="muted" style={styles.notice}>
            <Ionicons name="checkmark-circle" size={18} color={theme.success} />
            <ThemedText type="small" themeColor="success" style={styles.flex}>
              {note}
            </ThemedText>
          </Card>
        ) : null}
      </View>
    </ThemedView>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: theme.dangerMuted }]}>
        <ThemedText type="caption" style={{ color: theme.danger, fontWeight: 700 }}>
          {n}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingBottom: Spacing.five,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
  },
  heroInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.three,
  },
  backChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  kicker: {
    color: Overlay.onGradientFaint,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.half,
  },
  onGradient: {
    color: Overlay.onGradient,
  },
  onGradientFaint: {
    color: Overlay.onGradientFaint,
  },
  heroSub: {
    color: Overlay.onGradientMuted,
    marginTop: Spacing.one,
  },
  liveDotWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Overlay.glassBg,
    borderWidth: 1,
    borderColor: Overlay.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FCA5A5',
  },
  heroSkeleton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  idleCta: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  bigSos: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: Overlay.glassBgStrong,
    borderWidth: 2,
    borderColor: Overlay.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  bigSosLabel: {
    color: Overlay.onGradient,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 3,
  },
  bigSosHint: {
    color: Overlay.onGradientFaint,
  },
  activeBadges: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.three,
    marginTop: -Spacing.four,
  },
  stack: {
    gap: Spacing.three,
  },
  panel: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
