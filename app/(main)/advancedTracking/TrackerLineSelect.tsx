import type { RecentLine as RecentLineType } from '@/components/advancedTracking/TrackerLineScreen';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getAdvancedPointLineRecords,
  getAdvancedRecentLines,
  getCurrentPoint,
  getLineReceivingSideId,
  getSideScore,
} from '@/lib/advancedTracking/trackingUtils';
import { GenderRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { FOCUS_SIDE_ID } from './PreGameConfirm';

export default function TrackerLineSelectScreen() {
  const { currentGame: game, resetCurrentGame } = useAdvancedTrackingStore();
  const participants = useLiveRosterParticipants(game?.participants ?? []);
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
  const oppSide = game.sides.find((side) => side.id !== game.focusSideId);
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = oppSide != null ? getSideScore(game, oppSide.id) : 0;
  const receivingSideId = getLineReceivingSideId(game, point);
  const pointTypeLabel = receivingSideId === game.focusSideId ? 'O-Point' : 'D-Point';
  const lineSelectTitle = `${pointTypeLabel} · ${focusScore}-${oppScore}`;

  const recentLines: RecentLineType[] = getAdvancedRecentLines(game);
  const pointLines = getAdvancedPointLineRecords(game);
  const handleBack = () => {
    if (isInitialLine) {
      resetCurrentGame();
      router.dismissTo('/advancedTracking/PreGameConfirm');
      return;
    }

    router.dismissTo('/advancedTracking/Tracker');
  };

  return (
    <TrackerLineScreen
      participants={participants}
      title={lineSelectTitle}
      expectedRatio={nextRatio}
      sequenceNumber={nextSequenceNumber}
      onBack={handleBack}
      recentLines={recentLines}
      pointLines={pointLines}
      currentPoint={nextPointNumber}
      onConfirm={(ids) => {
        const isOurPull = receivingSideId !== game.focusSideId;

        let lineIds: string[];
        if (hasItems(ids)) {
          lineIds = [...ids];
        } else if (point) {
          lineIds = getEffectiveLineParticipantIds(point, FOCUS_SIDE_ID);
        } else {
          lineIds = [];
        }

        router.push({
          pathname: '/advancedTracking/PullTracking',
          params: {
            isOurPull: String(isOurPull),
            lineParticipantIds: JSON.stringify(lineIds),
            ...(nextRatio != null && { genderRatio: nextRatio }),
          },
        });
      }}
    />
  );
}
