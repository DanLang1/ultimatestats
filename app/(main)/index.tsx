import { Redirect } from 'expo-router';
import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useTutorialStore } from '@/store/tutorialStore';

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
