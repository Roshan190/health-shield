import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ensureNotificationPermissions,
  getNotificationCapability,
  openSystemNotificationSettings,
  type NotificationCapability,
} from '@/lib/notifications/runtime';
import { resyncAllLocalReminders } from '@/lib/notifications/resync';

type ReminderStatusCardProps = {
  /** Extra context under the capability message. */
  detail?: string;
  /** When true, hide the card if reminders are already granted. */
  hideWhenGranted?: boolean;
};

export function ReminderStatusCard({
  detail,
  hideWhenGranted = false,
}: ReminderStatusCardProps) {
  const theme = useTheme();
  const [capability, setCapability] = useState<NotificationCapability | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setCapability(await getNotificationCapability());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (!capability) {
    return null;
  }
  if (hideWhenGranted && capability.status === 'granted') {
    return null;
  }

  const tint =
    capability.status === 'granted'
      ? theme.success
      : capability.status === 'unsupported'
        ? theme.textSecondary
        : theme.warning;

  const icon: keyof typeof Ionicons.glyphMap =
    capability.status === 'granted'
      ? 'checkmark-circle'
      : capability.status === 'unsupported'
        ? 'phone-portrait-outline'
        : 'notifications-off';

  async function onEnable() {
    setBusy(true);
    try {
      const next = await ensureNotificationPermissions();
      setCapability(next);
      if (next.status === 'granted') {
        await resyncAllLocalReminders();
      } else if (next.status === 'denied' && !next.canAskAgain) {
        await openSystemNotificationSettings();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOpenSettings() {
    setBusy(true);
    try {
      await openSystemNotificationSettings();
    } finally {
      setBusy(false);
    }
  }

  const showEnable =
    capability.status === 'undetermined' ||
    (capability.status === 'denied' && capability.canAskAgain);
  const showSettings = capability.status === 'denied' && !capability.canAskAgain;

  return (
    <Card variant="tinted" style={styles.card}>
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.body}>
        <ThemedText type="smallBold">
          {capability.status === 'granted'
            ? 'Reminders on'
            : capability.status === 'unsupported'
              ? 'Reminders unavailable'
              : 'Reminders need permission'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {capability.message}
          {detail ? ` ${detail}` : ''}
        </ThemedText>
        {showEnable ? (
          <Button
            label="Enable reminders"
            icon="notifications"
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={onEnable}
            style={styles.action}
          />
        ) : null}
        {showSettings ? (
          <Button
            label="Open settings"
            icon="settings"
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={onOpenSettings}
            style={styles.action}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
});
