import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Checks if the LineEditor screen should be shown.
 * Call this after a point completes (from PointSummaryModal, StatEntryOverlay, etc.)
 * to determine if we should navigate to LineEditor.
 */
export function shouldShowLinePrompt(): boolean {
  const { lineCallingEnabled } = useSettingsStore.getState();
  const { currentPoint, pointLines, currentGameStatus, isHalftimeBreak, statTrackingEnabled } =
    useGameStore.getState();

  if (!lineCallingEnabled || !statTrackingEnabled) return false;
  if (currentGameStatus === 'finished' || isHalftimeBreak) return false;

  const hasLineForPoint = pointLines.some(
    (record) => record.pointNumber === currentPoint && !record.isSubstitution,
  );

  return !hasLineForPoint;
}
