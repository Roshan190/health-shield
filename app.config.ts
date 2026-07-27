import type { ExpoConfig, ConfigContext } from 'expo/config';

/** Pass-through dynamic config (keeps app.json as the base). */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'HealthShield',
  slug: config.slug ?? 'HealthShield',
});
