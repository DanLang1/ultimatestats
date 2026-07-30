import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';

import type { RecentLine as RecentLineType } from '@/components/advancedTracking/TrackerLineScreen';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getAdvancedPointLineRecords,
  getAdvancedRecentLines,
  getCurrentPoint,
  getLineReceivingSideId,
  getScrimmageLineSelectionGroups,
  getSideScore,
} from '@/lib/advancedTracking/trackingUtils';
import { GenderRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function TrackerLineSelectScreen() {
  const { currentGame: game, resetCurrentGame } = useAdvancedTrackingStore();
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const [firstSideLineIds, setFirstSideLineIds] = useState<string[] | null>(null);
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  if (!game) return <Redirect href="/advancedTracking/Tracker" />;

  const point = getCurrentPoint(game);
  const nextPointNumber = game.points.length + 1;
  const nextRatio: GenderRatio | undefined =
    genderRatioEnabled && firstPointRatio != null
      ? getExpectedRatio(nextPointNumber, firstPointRatio)
      : undefined;
  const nextSequenceNumber = nextRatio != null ? getSequenceNumber(nextPointNumber) : undefined;

  const isInitialLine = game.points.length === 0;
  const isScrimmage = game.gameType === 'scrimmage';
  const tracksBothSides = areBothSidesFullyTracked(game);
  const oppSide = game.sides.find((side) => side.id !== game.focusSideId);
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = oppSide != null ? getSideScore(game, oppSide.id) : 0;
  const receivingSideId = getLineReceivingSideId(game, point);
  const isSelectingSecondSideLine = tracksBothSides && firstSideLineIds != null;
  const selectedSideId = isSelectingSecondSideLine ? oppSide?.id : game.focusSideId;
  const selectedSide = game.sides.find((side) => side.id === selectedSideId);
  const pointTypeLabel = receivingSideId === selectedSideId ? 'O-Point' : 'D-Point';
  const lineSelectTitle = tracksBothSides
    ? `${selectedSide?.label ?? 'Side'} Line · ${focusScore}-${oppScore}`
    : `${pointTypeLabel} · ${focusScore}-${oppScore}`;

  const recentLines: RecentLineType[] = getAdvancedRecentLines(game, selectedSideId);
  const pointLines = getAdvancedPointLineRecords(game, selectedSideId);
  const eligibleParticipants = isSelectingSecondSideLine
    ? participants.filter((participant) => !firstSideLineIds.includes(participant.id))
    : participants;
  const { defaultParticipants, otherSideLabels } = getScrimmageLineSelectionGroups(
    game,
    selectedSideId,
    eligibleParticipants,
  );
  const handleBack = () => {
    if (isSelectingSecondSideLine) {
      setFirstSideLineIds(null);
      return;
    }

    if (isInitialLine) {
      resetCurrentGame();
      if (isScrimmage) {
        router.dismissTo({
          pathname: '/advancedTracking/PreGameConfirm',
          params: { gameType: 'scrimmage' },
        });
      } else {
        router.dismissTo('/advancedTracking/PreGameConfirm');
      }
      return;
    }

    router.dismissTo('/advancedTracking/Tracker');
  };

  return (
    <TrackerLineScreen
      key={selectedSideId}
      participants={defaultParticipants}
      allParticipants={isScrimmage ? eligibleParticipants : undefined}
      rosterParticipants={participants}
      playerStatusLabels={otherSideLabels}
      title={lineSelectTitle}
      expectedRatio={nextRatio}
      sequenceNumber={nextSequenceNumber}
      onBack={handleBack}
      recentLines={recentLines}
      pointLines={pointLines}
      currentPoint={nextPointNumber}
      onConfirm={(ids) => {
        if (tracksBothSides && !isSelectingSecondSideLine) {
          setFirstSideLineIds([...ids]);
          return;
        }

        const isOurPull = receivingSideId !== game.focusSideId;

        let lineIds: string[];
        if (hasItems(ids)) {
          lineIds = [...ids];
        } else if (point) {
          lineIds = getEffectiveLineParticipantIds(point, selectedSideId ?? game.focusSideId);
        } else {
          lineIds = [];
        }

        router.push({
          pathname: '/advancedTracking/PullTracking',
          params: {
            isOurPull: String(isOurPull),
            lineParticipantIds: JSON.stringify(lineIds),
            ...(tracksBothSides &&
              firstSideLineIds != null &&
              oppSide != null && {
                trackedLines: JSON.stringify([
                  { sideId: game.focusSideId, participantIds: firstSideLineIds },
                  { sideId: oppSide.id, participantIds: lineIds },
                ]),
              }),
            ...(nextRatio != null && { genderRatio: nextRatio }),
          },
        });
      }}
    />
  );
}
