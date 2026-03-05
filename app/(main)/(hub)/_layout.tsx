import HubTabBar from '@/components/navigation/HubTabBar';
import { Tabs } from 'expo-router';

export default function HubLayout() {
  return (
    <Tabs
      backBehavior="history"
      initialRouteName="(home)"
      tabBar={(props) => <HubTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="(analytics)" options={{ title: 'Stats' }} />
      <Tabs.Screen name="(team)" options={{ title: 'Team' }} />
    </Tabs>
  );
}
