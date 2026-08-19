import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  evaluateSideloadUpdate,
  installedVersionCode,
  installedVersionName,
  openSideloadDownload,
  sideloadUpdateUnsupported,
  type SideloadUpdateStatus,
} from '@/lib/updates/sideload';

/**
 * Profile row so a dismissed launch Alert is not the only way to open the
 * sideload download page. Hidden on Expo Go / iOS / web.
 */
export function SideloadUpdateCard() {
  const theme = useTheme();
  const [status, setStatus] = useState<SideloadUpdateStatus | null>(null);
  const [localName, setLocalName] = useState<string | null>(() =>
    sideloadUpdateUnsupported() ? null : installedVersionName()
  );
  const [localCode, setLocalCode] = useState<number | null>(() =>
    sideloadUpdateUnsupported() ? null : installedVersionCode()
  );
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (sideloadUpdateUnsupported()) {
      setStatus(null);
      setLocalName(null);
      setLocalCode(null);
      return;
    }
    setLocalName(installedVersionName());
    setLocalCode(installedVersionCode());
    setStatus(await evaluateSideloadUpdate());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  if (sideloadUpdateUnsupported()) {
    return null;
  }

  const versionName = status?.installedVersionName ?? localName;
  const versionCode = status?.installedVersionCode ?? localCode;
  if (!versionName || versionCode == null) {
    return null;
  }

  const updateAvailable = status?.updateAvailable === true;
  const tint = updateAvailable ? theme.warning : status ? theme.success : theme.textSecondary;
  const icon: keyof typeof Ionicons.glyphMap = updateAvailable
    ? 'cloud-download-outline'
    : status
      ? 'checkmark-circle'
      : 'phone-portrait-outline';

  async function onUpdate() {
    setBusy(true);
    try {
      await openSideloadDownload(status?.latest);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant={updateAvailable ? 'tinted' : 'muted'} style={styles.card}>
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.body}>
        <ThemedText type="smallBold">{updateAvailable ? 'Update available' : 'App version'}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {updateAvailable && status
            ? `HealthShield ${status.latest.version} is on the site. Sideload from there — not on Play Store yet. You are on ${versionName} (build ${versionCode}).`
            : status
              ? `HealthShield ${versionName} (build ${versionCode}). You are on the latest sideload build.`
              : `HealthShield ${versionName} (build ${versionCode}). Could not reach the site to check for a newer APK.`}
        </ThemedText>
        {updateAvailable ? (
          <Button
            label="Get update"
            icon="open-outline"
            size="sm"
            variant="secondary"
            loading={busy}
            onPress={() => void onUpdate()}
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
