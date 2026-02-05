import { isGameActive } from '@/lib/gameUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Hook to determine if a game is currently in progress.
 * Pulls from both gameStore and settingsStore to check all conditions.
 */
export function useIsGameActive(): boolean {
  const timerIsActive = useGameStore((s) => s.timerIsActive);
  const team1Score = useGameStore((s) => s.team1Score);
  const team2Score = useGameStore((s) => s.team2Score);
  const currentLine = useGameStore((s) => s.currentLine);
  const pointLines = useGameStore((s) => s.pointLines);
  const firstPointRatio = useSettingsStore((s) => s.firstPointRatio);

  return isGameActive({
    timerIsActive,
    team1Score,
    team2Score,
    firstPointRatio,
    currentLine,
    pointLines,
  });
}
