import { Redirect, router, Stack } from 'expo-router';

import { GameCompleteContent } from '@/components/game-complete/GameCompleteContent';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { getRecordedGameClockSecondsLeft } from '@/lib/basic/gameClockUtils';
import { checkGameOver, getWinner } from '@/lib/basic/gameUtils';
import { reportError } from '@/lib/sentry';
import { useGameStore } from '@/store/basic/gameStore';
import { useSavedBasicGamesStore } from '@/store/basic/savedGamesStore';
import { useCurrentTeam } from '@/store/teamStore';

export default function GameCompleteScreen() {
  const currentTeam = useCurrentTeam();
  const {
    team1Score,
    team2Score,
    gameTo,
    team2Name,
    statTrackingEnabled,
    undoLastAction,
    timerTimeLeft,
    currentGameStatus,
    pauseGameClock,
    setPostGameFlowPending,
    setCurrentGameStatus,
    currentGameId,
  } = useGameStore();
  const deleteSavedBasicGames = useSavedBasicGamesStore((state) => state.deleteGames);
  const { palette } = useTheme();
  const { finishActiveGameSession, restoreBasicGameSession } = useGameSessionActions();

  const team1Name = currentTeam.name;
  const isGameOver = checkGameOver({
    team1Score,
    team2Score,
    gameTo,
    gameClockSecondsLeft: getRecordedGameClockSecondsLeft({ timerTimeLeft }),
  });

  if (!isGameOver && currentGameStatus !== 'finished') {
    return <Redirect href="/scoreboard" />;
  }

  // Ended from Game Status before the score or clock finished it, so no point ended the game.
  const wasEndedEarly = !isGameOver;
  const isTie = team1Score === team2Score;
  const winnerTeam = isTie ? null : getWinner(team1Score, team2Score);
  const team1Won = winnerTeam === 'team1';
  const winnerName = team1Won ? team1Name : team2Name;
  const loserName = team1Won ? team2Name : team1Name;
  const winnerScore = team1Won ? team1Score : team2Score;
  const loserScore = team1Won ? team2Score : team1Score;

  const undoPointTitle = isTie ? 'Undo Last Point' : 'Undo Winning Point';
  const resumeActionTitle = wasEndedEarly ? 'Resume Game' : undoPointTitle;

  const handleGoHome = () => {
    pauseGameClock();
    setPostGameFlowPending(false);
    finishActiveGameSession();
    if (statTrackingEnabled && currentGameId != null) {
      router.replace({ pathname: '/saved-games/[gameId]', params: { gameId: currentGameId } });
      return;
    }
    router.replace('/dashboard');
  };

  const handleUndo = async () => {
    // The game is in progress again, so the record saved when it finished would be a stale copy.
    // Finishing the game again saves it under the same id.
    if (statTrackingEnabled && currentGameId != null) {
      try {
        await deleteSavedBasicGames([currentGameId]);
      } catch (error) {
        reportError('basic-game-undo-finish', error);
      }
    }
    setPostGameFlowPending(false);
    if (wasEndedEarly) {
      setCurrentGameStatus('inProgress');
    } else {
      undoLastAction();
    }
    restoreBasicGameSession();
    router.replace('/scoreboard');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <GameCompleteContent
        headerTitle="GAME COMPLETE"
        heroIcon={isTie ? 'handshake-outline' : 'trophy'}
        heroIconColor={isTie ? palette.textMuted : palette.warning}
        eyebrow="FINAL RESULT"
        heroTitle={isTie ? "It's a Tie" : winnerName}
        heroSubhead={isTie ? undefined : 'wins the game'}
        leftTeamLabel={isTie ? team1Name : winnerName}
        leftScore={isTie ? team1Score : winnerScore}
        rightTeamLabel={isTie ? team2Name : loserName}
        rightScore={isTie ? team2Score : loserScore}
        primaryCopyFills
        primaryAction={{
          title: 'Done',
          text: statTrackingEnabled ? 'Review the finished game stats' : 'Return to the dashboard',
          onPress: handleGoHome,
        }}
        secondaryAction={{
          title: resumeActionTitle,
          text: 'Return to the scoreboard and continue the game',
          onPress: handleUndo,
        }}
      />
    </>
  );
}
