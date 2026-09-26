import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/features/tabs';

/** Main app tabs (CLAUDE.md §6): Home | Meals | Coach | Progress | Profile. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="meals" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
