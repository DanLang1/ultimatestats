import type { Href } from 'expo-router';

import { getLiveInProgressGame, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameSessionStore } from '@/store/gameSessionStore';

type ActiveGameKind = 'advanced' | 'basic' | 'none';

type ActiveGameSession = {
  kind: ActiveGameKind;
  route: Href;
};

export function useActiveGameSession(): ActiveGameSession {
  const activeGameType = useGameSessionStore((state) => state.activeGameType);
  const activeAdvancedGameRoute = useAdvancedTrackingStore((state) => {
    const activeAdvancedGame = getLiveInProgressGame(state);
    if (activeAdvancedGame == null) return null;

    if (isAdvancedGameOver(activeAdvancedGame)) {
      return '/advancedTracking/TrackerGameComplete';
    }

    if (activeAdvancedGame.points.length > 0) {
      return '/advancedTracking/Tracker';
    }

    return '/advancedTracking/TrackerLineSelect';
  });

  if (activeGameType === 'basic') {
    return { kind: 'basic', route: '/Scoreboard' };
  }

  if (activeGameType !== 'advanced') {
    return { kind: 'none', route: '/Dashboard' };
  }

  if (activeAdvancedGameRoute != null) {
    return { kind: 'advanced', route: activeAdvancedGameRoute };
  }

  return { kind: 'none', route: '/Dashboard' };
}
