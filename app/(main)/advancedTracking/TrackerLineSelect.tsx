import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import type { RecentLine as RecentLineType } from '@/components/advancedTracking/TrackerLineScreen';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getAdvancedRecentLines,
  getCurrentPoint,
  getReceivingSideForNextPoint,
} from '@/lib/advancedTracking/trackingUtils';
import { getExpectedRatio, getSequenceNumber, GenderRatio } from '@/lib/genderRatioUtils';
import { hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { FOCUS_SIDE_ID } from './PreGameConfirm';

export default function TrackerLineSelectScreen() {
  const { currentGameId, savedGames, resetCurrentGame } = useAdvancedTrackingStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return <Redirect href="/advancedTracking/Tracker" />;

  const point = getCurrentPoint(game);
  const nextPointNumber = game.points.length + 1;
  const nextRatio: GenderRatio | undefined =
    genderRatioEnabled && firstPointRatio != null
      ? getExpectedRatio(nextPointNumber, firstPointRatio)
      : undefined;
  const nextSequenceNumber = nextRatio != null ? getSequenceNumber(nextPointNumber) : undefined;

  const isInitialLine = game.points.length === 0;

  const recentLines: RecentLineType[] = getAdvancedRecentLines(game);
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
      participants={game.participants}
      title={isInitialLine ? 'Starting Line' : undefined}
      expectedRatio={nextRatio}
      sequenceNumber={nextSequenceNumber}
      onBack={handleBack}
      recentLines={recentLines}
      onConfirm={(ids) => {
        const receivingSideId = getReceivingSideForNextPoint(game);
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
