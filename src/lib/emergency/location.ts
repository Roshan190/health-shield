import * as Location from 'expo-location';

import type { SosCoords } from '@/lib/emergency/sos-session';

export type LocationPermissionResult =
  | { ok: true }
  | { ok: false; message: string; canAskAgain: boolean };

export async function ensureForegroundLocationPermission(): Promise<LocationPermissionResult> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    return { ok: true };
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  if (requested.granted) {
    return { ok: true };
  }

  return {
    ok: false,
    canAskAgain: requested.canAskAgain,
    message: requested.canAskAgain
      ? 'Location permission is needed to share where you are during an SOS.'
      : 'Location is blocked. Enable it in system Settings for HealthShield, then try again.',
  };
}

export async function getCurrentSosCoords(): Promise<SosCoords | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy:
        typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Foreground-only watch while SOS is on screen. Caller must remove the subscription. */
export async function watchSosLocation(
  onUpdate: (coords: SosCoords) => void
): Promise<Location.LocationSubscription | null> {
  try {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 15_000,
      },
      (position) => {
        onUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
          updatedAt: new Date().toISOString(),
        });
      }
    );
  } catch {
    return null;
  }
}

export function mapsLinkForCoords(coords: Pick<SosCoords, 'latitude' | 'longitude'>) {
  return `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
}

export function formatCoords(coords: SosCoords) {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}
