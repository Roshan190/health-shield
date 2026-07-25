import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'healthshield.theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  isHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
};

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  isHydrated: false,
  setPreference: (preference) => {
    set({ preference });
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (isPreference(stored)) {
        set({ preference: stored, isHydrated: true });
        return;
      }
    } catch {
      // Keep default; still mark hydrated so the app can boot.
    }
    set({ isHydrated: true });
  },
}));

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
