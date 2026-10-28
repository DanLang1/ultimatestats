import { router, type Href } from 'expo-router';

import { getLiveInProgressGame, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';

type ActiveGameKind = 'advanced' | 'basic' | 'none';

export type ActiveGameSession = {
  kind: ActiveGameKind;
  route: Href;
};

/**
 * Returns to the live game. Stats can open from the tracker menu on top of a still-mounted
 * tracker, so advanced games pop back to it rather than stacking a second tracker that would
 * outlive the game.
 */
export function resumeGameSession(session: ActiveGameSession) {
  if (session.kind === 'none') throw new Error('No active game session to resume.');
  if (session.kind === 'advanced') {
    router.dismissTo(session.route);
    return;
  }
  router.navigate(session.route);
}

export function useActiveGameSession(): ActiveGameSession {
  const activeGameType = useGameSessionStore((state) => state.activeGameType);
  const activeAdvancedGameRoute = useAdvancedTrackingStore((state) => {
    const activeAdvancedGame = getLiveInProgressGame(state);
    if (activeAdvancedGame == null) return null;

    if (isAdvancedGameOver(activeAdvancedGame)) {
      return '/advanced-tracking/tracker-game-complete';
    }

    if (activeAdvancedGame.points.length > 0) {
      return '/advanced-tracking/tracker';
    }

    return '/advanced-tracking/tracker-line-select';
  });

  if (activeGameType === 'basic') {
    return { kind: 'basic', route: '/scoreboard' };
  }

  if (activeGameType !== 'advanced') {
    return { kind: 'none', route: '/dashboard' };
  }

  if (activeAdvancedGameRoute != null) {
    return { kind: 'advanced', route: activeAdvancedGameRoute };
  }

  return { kind: 'none', route: '/dashboard' };
}

/** Live advanced games always have stats; basic games only when stat tracking is on. */
export function useHasLiveStats(): boolean {
  const { kind } = useActiveGameSession();
  const statTrackingEnabled = useGameStore((state) => state.statTrackingEnabled);
  return kind === 'advanced' || (kind === 'basic' && statTrackingEnabled);
}
