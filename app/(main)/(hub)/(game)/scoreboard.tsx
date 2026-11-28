import { Redirect, usePathname } from 'expo-router';

import LiveScoreboard from '@/components/basic/scoreboard/LiveScoreboard';
import { useStatsTutorialPending } from '@/hooks/basic/useStatsTutorialPending';
import { getRecordedGameClockSecondsLeft } from '@/lib/basic/gameClockUtils';
import { checkGameOver } from '@/lib/basic/gameUtils';
import { useGameStore } from '@/store/basic/gameStore';

export default function BasicScoreboard() {
  const {
    team1Score,
    team2Score,
    currentGameStatus,
    isPostGameFlowPending,
    gameTo,
    timerTimeLeft,
    isHalftimeBreak,
    pendingStatEntry,
  } = useGameStore();
  const statsTutorialPending = useStatsTutorialPending();
  const pathname = usePathname();

  const isGameOver = checkGameOver({
    team1Score,
    team2Score,
    gameTo,
    gameClockSecondsLeft: getRecordedGameClockSecondsLeft({ timerTimeLeft }),
  });

  if (currentGameStatus === 'finished' && pathname === '/scoreboard') {
    if (isPostGameFlowPending) {
      return <Redirect href="/game-complete" />;
    }

    return <Redirect href="/dashboard" />;
  }

  // The app can be closed on pre-game; Start is what copies its settings into the live game.
  if (currentGameStatus === 'fresh' && pathname === '/scoreboard') {
    return <Redirect href="/pre-game-confirm" />;
  }

  if (isHalftimeBreak && !pendingStatEntry && !isGameOver) {
    return <Redirect href="/halftime-modal" />;
  }

  if (statsTutorialPending) {
    return (
      <Redirect href={{ pathname: '/tutorial-stat-intro', params: { origin: 'onboarding' } }} />
    );
  }

  return <LiveScoreboard />;
}
