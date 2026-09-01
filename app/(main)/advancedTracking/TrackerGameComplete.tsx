import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';

import { GameCompleteLastActionCard } from '@/components/advancedTracking/GameCompleteLastActionCard';
import { GameCompleteContent } from '@/components/game-complete/GameCompleteContent';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { getFocusGameOutcome } from '@/lib/advancedTracking/buildAnalyticsGame';
import { getGameScore, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerGameCompleteScreen() {
  const { palette } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEarlyEndPending = mode === 'earlyEnd';

  const {
    currentGame: game,
    finalizeGame,
    finishTerminatedGame,
    undoLastOperation,
    terminateGame,
  } = useAdvancedTrackingStore();
  const { finishActiveGameSession, restoreAdvancedGameSession } = useGameSessionActions();

  if (!game) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const isTerminated = game.status === 'terminated';
  const gameIsOver = isAdvancedGameOver(game);
  const isEarlyEndFlow = isEarlyEndPending || isTerminated;

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
    const finishedGameId = game.id;
    if (isEarlyEndPending) {
      terminateGame('manual');
      await finishTerminatedGame();
    } else if (isTerminated) {
      await finishTerminatedGame();
    } else {
      await finalizeGame();
    }
    finishActiveGameSession();
    router.replace({
      pathname: '/advancedTracking/analytics/[gameId]',
      params: { gameId: finishedGameId, from: 'gameComplete' },
    });
  };

  const handleUndo = () => {
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
          title: 'Done',
          text: isEarlyEndFlow
            ? 'Save the game and review stats'
            : 'Save the result and review stats',
          onPress: handleFinish,
          testID: 'game-complete-finish',
        }}
        secondaryAction={{
          title: isEarlyEndFlow ? 'Undo End Game' : 'Undo Last Action',
          text: 'Return to the tracker and continue the game',
          onPress: handleUndo,
          testID: 'game-complete-undo',
        }}>
        {!isEarlyEndFlow ? <GameCompleteLastActionCard game={game} /> : null}
      </GameCompleteContent>
    </>
  );
}
