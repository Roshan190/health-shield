import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

/**
 * Default / web stub. Native builds resolve `hospitals-map.native.tsx` instead.
 * Keep this free of map native SDKs / WebView so Expo web SSR can render.
 */

export type HospitalsMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  pinColor: string;
  onPress: () => void;
};

export type HospitalsMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type HospitalsMapUserLocation = {
  latitude: number;
  longitude: number;
};

type HospitalsMapProps = {
  region: HospitalsMapRegion;
  markers: HospitalsMapMarker[];
  userLocation?: HospitalsMapUserLocation | null;
  onGestureActiveChange?: (active: boolean) => void;
};

export function HospitalsMap(_props: HospitalsMapProps): ReactNode {
  return (
    <View style={styles.fallback}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        Map view is available in the iOS/Android app.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    height: 160,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
