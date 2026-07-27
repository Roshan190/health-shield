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
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="policies" options={{ title: 'Policies' }} />
      <Tabs.Screen name="health" options={{ title: 'Health' }} />
      <Tabs.Screen name="family" options={{ title: 'Family' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Reachable from Home/Profile — not a bottom tab (D-012). */}
      <Tabs.Screen name="emergency" options={{ href: null }} />
    </Tabs>
  );
}
