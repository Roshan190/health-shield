import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useThemeName } from '@/hooks/use-theme';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { useIsAuthenticated, usePasswordRecovery, useSessionStore } from '@/lib/auth/session-store';
import { ensureNotificationHandler } from '@/lib/notifications/renewals';
import { useThemeStore } from '@/lib/theme/theme-store';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 450, fade: true });

function RootNavigator() {
  const themeName = useThemeName();
  const isAuthenticated = useIsAuthenticated();
  const passwordRecovery = usePasswordRecovery();
  const isSessionHydrated = useSessionStore((s) => s.isHydrated);
  const isThemeHydrated = useThemeStore((s) => s.isHydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateTheme();
    // Safe no-op on Android Expo Go (module throws if imported there).
    void ensureNotificationHandler();
  }, [hydrateTheme]);

  const isReady = isSessionHydrated && isThemeHydrated;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider value={themeName === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={passwordRecovery}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && !passwordRecovery}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated && !passwordRecovery}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
