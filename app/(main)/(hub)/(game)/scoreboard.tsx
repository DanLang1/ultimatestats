import { Redirect, usePathname } from 'expo-router';

import LiveScoreboard from '@/components/basic/scoreboard/LiveScoreboard';
import { useStatsTutorialPending } from '@/hooks/basic/useStatsTutorialPending';
import { getRecordedGameClockSecondsLeft } from '@/lib/basic/gameClockUtils';
import { checkGameOver } from '@/lib/basic/gameUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

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
    possession,
    statTrackingEnabled,
  } = useGameStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const statsTutorialPending = useStatsTutorialPending();
  const pathname = usePathname();

  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;
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

  if (isHalftimeBreak && !pendingStatEntry && !isGameOver) {
    return <Redirect href="/halftime-modal" />;
  }

  if (statsTutorialPending) {
    return (
      <Redirect href={{ pathname: '/tutorial-stat-intro', params: { origin: 'onboarding' } }} />
    );
  }

  if (!isGameOver && (needPossession || needRatio)) {
    return <Redirect href="/pre-game-confirm" />;
  }

  return <LiveScoreboard />;
}
