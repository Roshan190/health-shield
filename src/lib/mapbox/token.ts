/**
 * Public Mapbox token for in-app map tiles (@rnmapbox/maps).
 * Use a **pk.** token — never put a secret (sk.) token in the app bundle.
 * Nearby Search stays on the Edge Function secret `MAPBOX_ACCESS_TOKEN`.
 */
export function getMapboxPublicToken(): string | null {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || null;
}
