import { getLivePlayState } from '@/lib/advancedTracking/livePlayState';
import { canClearRedZone, canSetRedZone } from '@/lib/advancedTracking/trackerCommands';
import { getSideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getEffectiveGameTo,
  getSideScore,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useScoreBarData() {
  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const recordBetweenPointTimeout = useAdvancedTrackingStore(
    (state) => state.recordBetweenPointTimeout,
  );
  const recordStoppage = useAdvancedTrackingStore((state) => state.recordStoppage);
  const setCurrentPossessionRedZone = useAdvancedTrackingStore(
    (state) => state.setCurrentPossessionRedZone,
  );
  const genderRatioEnabled = useSettingsStore((state) => state.genderRatioEnabled);
  const firstPointRatio = useSettingsStore((state) => state.firstPointRatio);

  if (!game) return null;

  const focusSideId = game.focusSideId;
  const oppSide = game.sides.find((s) => s.id !== focusSideId);
  const oppSideId = oppSide?.id ?? '';

  const focusSideName = game.sides.find((s) => s.id === focusSideId)?.label ?? '';
  const oppSideName = oppSide?.label ?? '';

  const focusScore = getSideScore(game, focusSideId);
  const oppScore = getSideScore(game, oppSideId);
  const gameTo = getEffectiveGameTo(game);

  const focusTimeouts = getSideTimeoutState(game, focusSideId);
  const oppTimeouts = getSideTimeoutState(game, oppSideId);

  const { point, possession, pointIsOver, activeSideId, isPlayPaused } = getLivePlayState(game);
  const showPointTimer = point?.startedAt != null && !pointIsOver;
  const activeSide = game.sides.find((side) => side.id === activeSideId);
  const activePossession = isPossessionOver(possession) ? null : possession;
  const redZoneSelected = activePossession?.redZone != null;
  const redZoneToggle = redZoneSelected ? canClearRedZone(game) : canSetRedZone(game);
  const isRedZoneToggleAvailable = redZoneToggle.ok;

  const currentPointNumber = game.points.length;
  const ratioLabel =
    genderRatioEnabled && firstPointRatio && currentPointNumber > 0
      ? formatRatio(
          getExpectedRatio(currentPointNumber, firstPointRatio),
          getSequenceNumber(currentPointNumber),
        )
      : null;

  const handleTimeout = (sideId: string) => {
    if (isPlayPaused) return;
    const state = sideId === focusSideId ? focusTimeouts : oppTimeouts;
    const isFloater = state.regularUsedInHalf >= state.regularPerHalf;
    if (pointIsOver) {
      recordBetweenPointTimeout({ sideId, isFloater });
    } else {
      recordStoppage({ reason: 'timeout', sideId, isFloater });
    }
  };

  const handlePause = () => {
    if (isPlayPaused) return;
    recordStoppage({ reason: 'manual_pause' });
  };

  const handleRedZoneToggle = () => {
    if (!isRedZoneToggleAvailable) return;
    setCurrentPossessionRedZone(!redZoneSelected);
  };

  return {
    game,
    focusSideId,
    oppSideId,
    focusSideName,
    oppSideName,
    focusScore,
    oppScore,
    gameTo,
    focusTimeouts,
    oppTimeouts,
    pointIsOver,
    activeSideId,
    activeSideName: activeSide?.label ?? '',
    canToggleRedZone: isRedZoneToggleAvailable,
    redZoneSelected,
    isPointTimerPaused: isPlayPaused,
    showPointTimer,
    currentPointNumber,
    ratioLabel,
    stoppageActive: isPlayPaused,
    handleTimeout,
    handlePause,
    handleRedZoneToggle,
  };
}
