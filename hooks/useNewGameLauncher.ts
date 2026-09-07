import { router } from 'expo-router';
import { useState } from 'react';

import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';

type GameMode = 'advanced' | 'basic' | 'scrimmage';

export function useNewGameLauncher() {
  const [isNewGameSheetVisible, setIsNewGameSheetVisible] = useState(false);
  const activeSession = useActiveGameSession();
  const { startBasicGameSession, startAdvancedGameSession } = useGameSessionActions();

  const openNewGameSheet = () => setIsNewGameSheetVisible(true);
  const closeNewGameSheet = () => setIsNewGameSheetVisible(false);

  const startMode = (mode: GameMode) => {
    closeNewGameSheet();

    if (mode === 'advanced' || mode === 'scrimmage') {
      startAdvancedGameSession();
      const gameType = mode === 'scrimmage' ? 'scrimmage' : undefined;
      router.replace({
        pathname: '/advancedTracking/PreGameConfirm',
        params: gameType ? { gameType } : {},
      });
      return;
    }

    startBasicGameSession();
    router.replace('/PreGameConfirm');
  };

  return {
    isNewGameSheetVisible,
    activeGameKind: activeSession.kind,
    openNewGameSheet,
    closeNewGameSheet,
    startBasicGame: () => startMode('basic'),
    startAdvancedGame: () => startMode('advanced'),
    startScrimmage: () => startMode('scrimmage'),
  };
}
