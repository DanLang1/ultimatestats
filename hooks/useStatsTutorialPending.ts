import { useGameStore } from '@/store/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';

/**
 * Returns true when the stats tutorial is queued and stat tracking is enabled —
 * i.e. the user should be routed to TutorialStatIntro instead of a live game.
 */
export function useStatsTutorialPending(): boolean {
  const statTrackingEnabled = useGameStore((s) => s.statTrackingEnabled);
  const shouldShowStatsTutorialOnNextGameStart = useTutorialStore(
    (s) => s.shouldShowStatsTutorialOnNextGameStart,
  );
  return statTrackingEnabled && shouldShowStatsTutorialOnNextGameStart;
}
