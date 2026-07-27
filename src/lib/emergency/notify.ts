import * as SMS from 'expo-sms';
import { Share } from 'react-native';

import type { EmergencyCardSnapshot } from '@/lib/emergency/card-store';
import { formatCoords, mapsLinkForCoords } from '@/lib/emergency/location';
import type { SosCoords } from '@/lib/emergency/sos-session';

export function buildSosMessage(options: {
  card: EmergencyCardSnapshot | null;
  coords: SosCoords | null;
}) {
  const name = options.card?.fullName?.trim() || 'A HealthShield user';
  const blood = options.card?.bloodGroup?.trim();
  const lines = [
    `SOS from ${name} via HealthShield.`,
    'I need help. Please contact me or emergency services if you can.',
  ];
  if (blood) {
    lines.push(`Blood group: ${blood}`);
  }
  if (options.coords) {
    lines.push(`Location: ${formatCoords(options.coords)}`);
    lines.push(mapsLinkForCoords(options.coords));
  } else {
    lines.push('Location unavailable — ask me for my location.');
  }
  lines.push('This message was prepared in the app. Nothing is sent until you tap Send.');
  return lines.join('\n');
}

export async function sendSosSms(options: {
  phone: string | null | undefined;
  message: string;
}): Promise<{ ok: boolean; message?: string }> {
  const phone = options.phone?.trim();
  if (!phone) {
    return {
      ok: false,
      message: 'Add an emergency contact phone in Profile first, or use Share instead.',
    };
  }

  const available = await SMS.isAvailableAsync();
  if (!available) {
    return {
      ok: false,
      message: 'SMS is not available on this device. Use Share instead.',
    };
  }

  const result = await SMS.sendSMSAsync([phone], options.message);
  if (result.result === 'cancelled') {
    return { ok: false, message: 'SMS cancelled — nothing was sent.' };
  }
  return { ok: true };
}

export async function shareSosMessage(message: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const result = await Share.share({
      title: 'HealthShield SOS',
      message,
    });
    if (result.action === Share.dismissedAction) {
      return { ok: false, message: 'Share dismissed — nothing was sent.' };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Could not open share sheet',
    };
  }
}
