import LiveScoreboard from '@/components/basic/scoreboard/LiveScoreboard';
import { useStatsTutorialPending } from '@/hooks/basic/useStatsTutorialPending';
import { checkGameOver } from '@/lib/basic/gameUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Redirect, usePathname } from 'expo-router';

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
    timerTimeLeft,
  });

  if (currentGameStatus === 'finished' && pathname === '/Scoreboard') {
    if (isPostGameFlowPending) {
      return <Redirect href="/GameComplete" />;
    }

    return <Redirect href="/Dashboard" />;
  }

  if (isHalftimeBreak && !pendingStatEntry && !isGameOver) {
    return <Redirect href="/HalftimeModal" />;
  }

  if (statsTutorialPending) {
    return <Redirect href="/TutorialStatIntro" />;
  }

  if (!isGameOver && (needPossession || needRatio)) {
    return <Redirect href="/PreGameConfirm" />;
  }

  return <LiveScoreboard />;
}
