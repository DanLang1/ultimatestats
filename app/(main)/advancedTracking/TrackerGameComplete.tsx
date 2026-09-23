import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { GameCompleteLastActionCard } from '@/components/advancedTracking/GameCompleteLastActionCard';
import { GameCompleteContent } from '@/components/game-complete/GameCompleteContent';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { getFocusGameOutcome } from '@/lib/advancedTracking/buildAnalyticsGame';
import { getGameScore, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerGameCompleteScreen() {
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const [isSaving, setIsSaving] = useState(false);
  const finishPending = useRef(false);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEarlyEndPending = mode === 'earlyEnd';

  const {
    currentGame: game,
    finalizeGame,
    finishTerminatedGame,
    undoLastOperation,
    undoStack,
  } = useAdvancedTrackingStore();
  const { finishActiveGameSession, restoreAdvancedGameSession } = useGameSessionActions();

  if (!game) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const isTerminated = game.status === 'terminated';
  const gameIsOver = isAdvancedGameOver(game);
  const isEarlyEndFlow = isEarlyEndPending || isTerminated;
  const showUndoLastAction = isEarlyEndFlow || undoStack.length > 0;
  const showLastActionCard = !isEarlyEndFlow && !isSaving;

  if (!isEarlyEndPending && !isTerminated && !gameIsOver) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const score = getGameScore(game);
  const focusSide = game.sides.find((side) => side.id === game.focusSideId)!;
  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId)!;
  const focusScore = score[focusSide.id];
  const opponentScore = score[opponentSide.id];

  const outcome = getFocusGameOutcome(score, focusSide.id, opponentSide.id);
  const isTie = outcome === 'tie';
  const focusWon = outcome === 'win';
  const winnerName = focusWon ? focusSide.label : opponentSide.label;
  const loserName = focusWon ? opponentSide.label : focusSide.label;
  const winnerScore = focusWon ? focusScore : opponentScore;
  const loserScore = focusWon ? opponentScore : focusScore;

  let heroTitle = winnerName;
  if (isEarlyEndFlow) {
    heroTitle = 'Final Score';
  } else if (isTie) {
    heroTitle = "It's a Tie";
  }

  let heroIcon: keyof typeof MaterialCommunityIcons.glyphMap = 'trophy';
  if (isEarlyEndFlow) {
    heroIcon = 'stop-circle-outline';
  } else if (isTie) {
    heroIcon = 'handshake-outline';
  }

  let heroSubhead: string | undefined;
  if (isEarlyEndFlow) {
    heroSubhead = 'End this game before reaching the target score';
  } else if (!isTie) {
    heroSubhead = 'wins the game';
  }

  const handleFinish = async () => {
    if (finishPending.current) return;
    finishPending.current = true;
    setIsSaving(true);
    const finishedGameId = game.id;
    try {
      if (isEarlyEndPending) {
        await finishTerminatedGame('manual');
      } else if (isTerminated) {
        await finishTerminatedGame();
      } else {
        await finalizeGame();
      }
    } catch {
      finishPending.current = false;
      setIsSaving(false);
      showAlert({
        title: 'Unable to save game',
        message: 'Your game and undo history are still available. Tap Done to try again.',
      });
      return;
    }
    finishActiveGameSession();
    router.replace({
      pathname: '/advancedTracking/analytics/[gameId]',
      params: { gameId: finishedGameId, from: 'gameComplete' },
    });
  };

  const handleUndo = () => {
    if (finishPending.current) return;
    if (!isEarlyEndFlow) {
      undoLastOperation();
    }
    restoreAdvancedGameSession();
    router.replace('/advancedTracking/Tracker');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GameCompleteContent
        headerTitle={isEarlyEndFlow ? 'END GAME' : 'GAME COMPLETE'}
        heroIcon={heroIcon}
        heroIconColor={isEarlyEndFlow || isTie ? palette.textMuted : palette.warning}
        eyebrow={isEarlyEndFlow ? 'END EARLY' : 'FINAL RESULT'}
        heroTitle={heroTitle}
        heroSubhead={heroSubhead}
        leftTeamLabel={isTie ? focusSide.label : winnerName}
        leftScore={isTie ? focusScore : winnerScore}
        rightTeamLabel={isTie ? opponentSide.label : loserName}
        rightScore={isTie ? opponentScore : loserScore}
        secondaryActionFirst
        primaryAction={{
          title: isSaving ? 'Saving…' : 'Done',
          disabled: isSaving,
          text: isEarlyEndFlow
            ? 'Save the game and review stats'
            : 'Save the result and review stats',
          onPress: handleFinish,
          testID: 'game-complete-finish',
        }}
        secondaryAction={
          showUndoLastAction
            ? {
                title: isEarlyEndFlow ? 'Undo End Game' : 'Undo Last Action',
                text: 'Return to the tracker and continue the game',
                onPress: handleUndo,
                disabled: isSaving,
                testID: 'game-complete-undo',
              }
            : undefined
        }>
        {showLastActionCard ? <GameCompleteLastActionCard game={game} /> : null}
      </GameCompleteContent>
    </>
  );
}
