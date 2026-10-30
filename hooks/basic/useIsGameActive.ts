import { isGameActive } from '@/lib/basic/gameUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useIsGameActive(): boolean {
  const timerEndTime = useGameStore((s) => s.timerEndTime);
  const team1Score = useGameStore((s) => s.team1Score);
  const team2Score = useGameStore((s) => s.team2Score);
  const currentLine = useGameStore((s) => s.currentLine);
  const pointLines = useGameStore((s) => s.pointLines);
  const firstPointRatio = useSettingsStore((s) => s.firstPointRatio);

  return isGameActive({
    isGameClockRunning: timerEndTime !== null,
    team1Score,
    team2Score,
    firstPointRatio,
    currentLine,
    pointLines,
  });
}
