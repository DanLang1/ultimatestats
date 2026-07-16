import { useTheme } from '@/context/ThemeContext';
import HubTabBar from '@/components/navigation/HubTabBar';
import { Tabs } from 'expo-router';

export default function HubLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      initialRouteName="(home)"
      tabBar={(props) => <HubTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.primary },
      }}>
      <Tabs.Screen name="(home)" options={{ title: 'Home', tabBarButtonTestID: 'hub-tab-home' }} />
      <Tabs.Screen name="(game)" options={{ title: 'Game', tabBarButtonTestID: 'hub-tab-game' }} />
      <Tabs.Screen
        name="(analytics)"
        options={{ title: 'Stats', tabBarButtonTestID: 'hub-tab-stats' }}
      />
      <Tabs.Screen name="(team)" options={{ title: 'Team', tabBarButtonTestID: 'hub-tab-team' }} />
    </Tabs>
  );
}
