import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useTutorialStore } from '@/store/tutorialStore';
import { Redirect } from 'expo-router';

export default function IndexRoute() {
  const activeSession = useActiveGameSession();
  const hasHydrated = useTutorialStore((state) => state.hasHydrated);
  const hasSeenOnboarding = useTutorialStore((state) => state.hasSeenOnboarding);

  if (!hasHydrated) {
    return null;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/TutorialIntro" />;
  }

  return <Redirect href={activeSession.route} />;
}
