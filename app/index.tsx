import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useTutorialStore } from '@/store/tutorialStore';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function IndexRoute() {
  const { palette } = useTheme();
  const activeSession = useActiveGameSession();
  const hasHydrated = useTutorialStore((state) => state.hasHydrated);
  const hasSeenOnboarding = useTutorialStore((state) => state.hasSeenOnboarding);

  if (!hasHydrated) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <ActivityIndicator color={palette.accent} />
      </ThemedView>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/TutorialIntro" />;
  }

  return <Redirect href={activeSession.route} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
