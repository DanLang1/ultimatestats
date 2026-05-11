import {
  getActiveStoppage,
  getSideTimeoutState,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  getSideScore,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useScoreBarData() {
  const { currentGameId, savedGames, recordBetweenPointTimeout, recordStoppage } =
    useAdvancedTrackingStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const game = savedGames.find((g) => g.id === currentGameId);

  if (!game) return null;

  const focusSideId = game.focusSideId;
  const oppSide = game.sides.find((s) => s.id !== focusSideId);
  const oppSideId = oppSide?.id ?? '';

  const focusSideName = game.sides.find((s) => s.id === focusSideId)?.label ?? '';
  const oppSideName = oppSide?.label ?? '';

  const focusScore = getSideScore(game, focusSideId);
  const oppScore = getSideScore(game, oppSideId);

  const focusTimeouts = getSideTimeoutState(game, focusSideId);
  const oppTimeouts = getSideTimeoutState(game, oppSideId);

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeStoppage = getActiveStoppage(possession);
  const stoppageActive = activeStoppage !== null;
  const isPointTimerPaused = activeStoppage !== null;
  const showPointTimer = point?.startedAt != null && !hasPointEnded(point);

  const currentPointNumber = game.points.length;
  const ratioLabel =
    genderRatioEnabled && firstPointRatio && currentPointNumber > 0
      ? formatRatio(
          getExpectedRatio(currentPointNumber, firstPointRatio),
          getSequenceNumber(currentPointNumber),
        )
      : null;

  const handleTimeout = (sideId: string) => {
    if (activeStoppage) return;
    const state = sideId === focusSideId ? focusTimeouts : oppTimeouts;
    const isFloater = state.regularUsedInHalf >= state.regularPerHalf;
    if (pointIsOver) {
      recordBetweenPointTimeout({ sideId, isFloater });
    } else {
      recordStoppage({ reason: 'timeout', sideId, isFloater });
    }
  };

  const handlePause = () => {
    if (activeStoppage) return;
    recordStoppage({ reason: 'manual_pause' });
  };

  return {
    game,
    focusSideId,
    oppSideId,
    focusSideName,
    oppSideName,
    focusScore,
    oppScore,
    focusTimeouts,
    oppTimeouts,
    pointIsOver,
    isPointTimerPaused,
    showPointTimer,
    currentPointNumber,
    ratioLabel,
    stoppageActive,
    handleTimeout,
    handlePause,
  };
}
