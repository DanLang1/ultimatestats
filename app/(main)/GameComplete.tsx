import { Redirect, router, Stack } from 'expo-router';

import { GameCompleteContent } from '@/components/game-complete/GameCompleteContent';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { checkGameOver, getWinner } from '@/lib/basic/gameUtils';
import { useGameStore } from '@/store/basic/gameStore';

export default function GameCompleteScreen() {
  const {
    team1Score,
    team2Score,
    gameTo,
    currentTeam,
    team2Name,
    statTrackingEnabled,
    undoLastAction,
    timerTimeLeft,
    currentGameStatus,
    setTimerActive,
    setPostGameFlowPending,
    currentGameId,
  } = useGameStore();
  const { palette } = useTheme();
  const { finishActiveGameSession, restoreBasicGameSession } = useGameSessionActions();

  const team1Name = currentTeam.name;
  const isGameOver = checkGameOver({ team1Score, team2Score, gameTo, timerTimeLeft });

  if (!isGameOver && currentGameStatus !== 'finished') {
    return <Redirect href="/Scoreboard" />;
  }

  const isTie = team1Score === team2Score;
  const winnerTeam = isTie ? null : getWinner(team1Score, team2Score);
  const team1Won = winnerTeam === 'team1';
  const winnerName = team1Won ? team1Name : team2Name;
  const loserName = team1Won ? team2Name : team1Name;
  const winnerScore = team1Won ? team1Score : team2Score;
  const loserScore = team1Won ? team2Score : team1Score;

  const handleGoHome = () => {
    setTimerActive(false);
    setPostGameFlowPending(false);
    finishActiveGameSession();
    if (statTrackingEnabled && currentGameId != null) {
      router.replace({ pathname: '/saved-games/[gameId]', params: { gameId: currentGameId } });
      return;
    }
    router.replace('/Dashboard');
  };

  const handleUndo = () => {
    setPostGameFlowPending(false);
    undoLastAction();
    restoreBasicGameSession();
    router.replace('/Scoreboard');
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
          title: isTie ? 'Undo Last Point' : 'Undo Winning Point',
          text: 'Return to the scoreboard and continue the game',
          onPress: handleUndo,
        }}
      />
    </>
  );
}
