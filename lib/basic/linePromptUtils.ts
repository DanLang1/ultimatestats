import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Checks if the LineEditor screen should be shown.
 * Call this after a point completes (from PointSummaryModal, StatEntryOverlay, etc.)
 * to determine if we should navigate to LineEditor.
 *
 * Returns true if:
 * - Line calling is enabled
 * - Stat tracking is enabled
 * - Game is not locked
 * - Not at halftime
 * - Line not already set for the current point
 */
export function shouldShowLinePrompt(): boolean {
  const { lineCallingEnabled } = useSettingsStore.getState();
  const { currentPoint, pointLines, currentGameStatus, isHalftimeBreak, statTrackingEnabled } =
    useGameStore.getState();

  if (!lineCallingEnabled || !statTrackingEnabled) return false;
  if (currentGameStatus === 'finished' || isHalftimeBreak) return false;

  // Check if line already set for current point
  const hasLineForPoint = pointLines.some(
    (record) => record.pointNumber === currentPoint && !record.isSubstitution,
  );

  return !hasLineForPoint;
}
