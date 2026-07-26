import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { PullDropperStep } from '@/components/advancedTracking/pullTracker/PullDropperStep';
import { PullResultStep } from '@/components/advancedTracking/pullTracker/PullResultStep';
import { PullTimingStep } from '@/components/advancedTracking/pullTracker/PullTimingStep';
import {
  buildRecordPullInput,
  getFlowParticipants,
} from '@/lib/advancedTracking/pullTrackingUtils';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getOtherSideId } from '@/lib/advancedTracking/trackingUtils';
import { PointLine, PullResult } from '@/lib/advancedTracking/types';
import { GenderRatio } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

type Step =
  | { name: 'timing' }
  | { name: 'result'; pullerId: string | null | undefined; hangTimeMs: number }
  | { name: 'dropper'; pullerId: string | null | undefined; hangTimeMs: number };

export default function PullTrackingScreen() {
  const {
    isOurPull: isOurPullParam,
    lineParticipantIds: idsParam,
    trackedLines: trackedLinesParam,
    genderRatio: genderRatioParam,
  } = useLocalSearchParams<{
    isOurPull: string;
    lineParticipantIds: string;
    trackedLines?: string;
    genderRatio: GenderRatio;
  }>();

  const isOurPull = isOurPullParam === 'true';
  const lineParticipantIds: string[] = idsParam ? JSON.parse(idsParam) : [];
  const genderRatio = genderRatioParam;

  const {
    currentGame: game,
    clearHalftimeBreak,
    isHalftimeBreakActive,
    recordPull,
  } = useAdvancedTrackingStore();

  const [step, setStep] = useState<Step>({ name: 'timing' });

  if (!game) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const trackedLines: PointLine[] | undefined = trackedLinesParam
    ? JSON.parse(trackedLinesParam)
    : undefined;
  const tracksBothSides = areBothSidesFullyTracked(game) && trackedLines != null;
  const opponentSideId = getOtherSideId(game, game.focusSideId);
  const pullingSideId = isOurPull ? game.focusSideId : opponentSideId;
  const receivingSideId = getOtherSideId(game, pullingSideId);
  const pullingLineIds = tracksBothSides
    ? (trackedLines.find((line) => line.sideId === pullingSideId)?.participantIds ?? [])
    : lineParticipantIds;
  const receivingLineIds = tracksBothSides
    ? (trackedLines.find((line) => line.sideId === receivingSideId)?.participantIds ?? [])
    : lineParticipantIds;
  const activeParticipants = getFlowParticipants(game, pullingLineIds);
  const receivingParticipants = getFlowParticipants(game, receivingLineIds);
  const pullingSideLabel = tracksBothSides
    ? game.sides.find((side) => side.id === pullingSideId)?.label
    : undefined;

  const handleComplete = (
    result: PullResult,
    pullerId: string | null | undefined,
    hangTimeMs: number,
    receiverId?: string | null,
  ) => {
    recordPull(
      buildRecordPullInput({
        game,
        isOurPull,
        lineParticipantIds,
        lines: trackedLines,
        isPullerTracked: tracksBothSides || isOurPull,
        selectedPullerId: pullerId,
        hangTimeMs,
        result,
        receiverId,
        genderRatio,
      }),
    );
    if (isHalftimeBreakActive) {
      clearHalftimeBreak();
    }
    router.dismissTo('/advancedTracking/Tracker');
  };

  if (step.name === 'timing') {
    return (
      <PullTimingStep
        isOurPull={isOurPull}
        sideLabel={pullingSideLabel}
        isPullerTracked={tracksBothSides || isOurPull}
        activeParticipants={activeParticipants}
        onNext={(pullerId, hangTimeMs) => {
          if (!isOurPull && !tracksBothSides) {
            handleComplete('inbound', pullerId, hangTimeMs);
            return;
          }
          setStep({ name: 'result', pullerId, hangTimeMs });
        }}
        onBack={() => router.back()}
      />
    );
  }

  if (step.name === 'result') {
    return (
      <PullResultStep
        isOurPull={isOurPull}
        sideLabel={pullingSideLabel}
        isPullerTracked={tracksBothSides || isOurPull}
        canSelectDropper={tracksBothSides || !isOurPull}
        activeParticipants={activeParticipants}
        pullerId={step.pullerId}
        hangTimeMs={step.hangTimeMs}
        onComplete={(result, receiverId) =>
          handleComplete(result, step.pullerId, step.hangTimeMs, receiverId)
        }
        onDropped={() =>
          setStep({ name: 'dropper', pullerId: step.pullerId, hangTimeMs: step.hangTimeMs })
        }
        onBack={() => setStep({ name: 'timing' })}
      />
    );
  }

  return (
    <PullDropperStep
      activeParticipants={receivingParticipants}
      onComplete={(receiverId) =>
        handleComplete('dropped', step.pullerId, step.hangTimeMs, receiverId)
      }
      onBack={() =>
        setStep({ name: 'result', pullerId: step.pullerId, hangTimeMs: step.hangTimeMs })
      }
    />
  );
}
