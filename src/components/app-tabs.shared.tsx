import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => (
        <FloatingTabBar
          state={props.state}
          descriptors={props.descriptors}
          navigation={props.navigation}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Leave a nested stack (e.g. Policies → Add) then return → land on tab root,
        // not the buried screen. Fixes Cancel/back feeling stuck on /new.
        popToTopOnBlur: true,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="policies" options={{ title: 'Policies' }} />
      <Tabs.Screen name="health" options={{ title: 'Health' }} />
      <Tabs.Screen name="family" options={{ title: 'Family' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Reachable from Home — not bottom tabs (D-012 / D-025). */}
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="hospitals" options={{ href: null }} />
      <Tabs.Screen name="claims" options={{ href: null }} />
      <Tabs.Screen name="visit" options={{ href: null }} />
    </Tabs>
  );
}
