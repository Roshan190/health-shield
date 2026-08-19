const HOUR_MS = 60 * 60 * 1000;
const EXPIRING_SOON_MS = 12 * HOUR_MS;

export type ConsentStatusKey = 'active' | 'expiring' | 'expired' | 'revoked';

export type ConsentStatusInfo = {
  key: ConsentStatusKey;
  label: string;
  /** True when the pack can no longer be opened. */
  closed: boolean;
};

export function consentStatus(status: string, expiresAt: string): ConsentStatusInfo {
  if (status === 'revoked') {
    return { key: 'revoked', label: 'Revoked', closed: true };
  }
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) {
    return { key: 'expired', label: 'Expired', closed: true };
  }
  if (remaining <= EXPIRING_SOON_MS) {
    return { key: 'expiring', label: `Expires in ${formatRemaining(remaining)}`, closed: false };
  }
  return { key: 'active', label: 'Active', closed: false };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / HOUR_MS);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 1) return hours === 1 ? '1 hour' : `${hours} hours`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
