import { router } from 'expo-router';
import { useState } from 'react';

import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { useTutorialStore } from '@/store/tutorialStore';

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
      const hasSeenAdvancedTutorial = useTutorialStore.getState().hasSeenAdvancedTutorial;
      router.replace(
        hasSeenAdvancedTutorial ? '/advancedTracking/PreGameConfirm' : '/TutorialAdvancedTracker',
      );
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
  };
}
