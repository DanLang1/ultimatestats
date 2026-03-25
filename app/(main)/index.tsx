import { Redirect } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';

export default function IndexRoute() {
  const currentGameStatus = useGameStore((state) => state.currentGameStatus);
  const isPostGameFlowPending = useGameStore((state) => state.isPostGameFlowPending);
  const hasHydrated = useTutorialStore((state) => state.hasHydrated);
  const hasSeenOnboarding = useTutorialStore((state) => state.hasSeenOnboarding);

  if (!hasHydrated) {
    return null;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/TutorialIntro" />;
  }

  if (currentGameStatus === 'finished') {
    return <Redirect href={isPostGameFlowPending ? '/GameComplete' : '/Dashboard'} />;
  }

  if (currentGameStatus !== 'inProgress') {
    return <Redirect href="/Dashboard" />;
  }

  return <Redirect href="/Scoreboard" />;
}
