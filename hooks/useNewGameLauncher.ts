import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { router } from 'expo-router';
import { useState } from 'react';

type GameMode = 'advanced' | 'basic';

export function useNewGameLauncher() {
  const [isNewGameSheetVisible, setIsNewGameSheetVisible] = useState(false);
  const activeSession = useActiveGameSession();
  const { startBasicGameSession, startAdvancedGameSession } = useGameSessionActions();

  const openNewGameSheet = () => setIsNewGameSheetVisible(true);
  const closeNewGameSheet = () => setIsNewGameSheetVisible(false);

  const startMode = (mode: GameMode) => {
    closeNewGameSheet();

    if (mode === 'advanced') {
      startAdvancedGameSession();
      router.replace('/advancedTracking/PreGameConfirm');
      return;
    }

    startBasicGameSession();
    router.replace('/Scoreboard');
  };

  return {
    isNewGameSheetVisible,
    activeGameKind: activeSession.kind,
    openNewGameSheet,
    closeNewGameSheet,
    startBasicGame: () => startMode('basic'),
    startAdvancedGame: () => startMode('advanced'),
  };
}
