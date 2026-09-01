import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { PullDropperStep } from '@/components/advancedTracking/pullTracker/PullDropperStep';
import { PullResultStep } from '@/components/advancedTracking/pullTracker/PullResultStep';
import { PullTimingStep } from '@/components/advancedTracking/pullTracker/PullTimingStep';
import {
  buildRecordPullInput,
  getFlowParticipants,
} from '@/lib/advancedTracking/pullTrackingUtils';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getOtherSideId, getReceivingSideForNextPoint } from '@/lib/advancedTracking/trackingUtils';
import { PullResult } from '@/lib/advancedTracking/types';
import { getExpectedRatio } from '@/lib/genderRatioUtils';
import { resolvePendingNextPointLines } from '@/store/advancedTracking/pendingLineSelection';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';

type Step =
  | { name: 'timing' }
  | { name: 'result'; pullerId: string | null | undefined; hangTimeMs: number }
  | { name: 'dropper'; pullerId: string | null | undefined; hangTimeMs: number };

export default function PullTrackingScreen() {
  const {
    currentGame: game,
    clearHalftimeBreak,
    isHalftimeBreakActive,
    pendingNextPointLineSelection,
    recordPull,
  } = useAdvancedTrackingStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const [step, setStep] = useState<Step>({ name: 'timing' });

  if (!game) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const lines = resolvePendingNextPointLines(game, pendingNextPointLineSelection);
  if (lines == null) {
    return <Redirect href="/advancedTracking/TrackerLineSelect" />;
  }

  const receivingSideId = getReceivingSideForNextPoint(game);
  const pullingSideId = getOtherSideId(game, receivingSideId);
  const isOurPull = pullingSideId === game.focusSideId;
  const tracksBothSides = areBothSidesFullyTracked(game);
  const pullingLine = lines.find((line) => line.sideId === pullingSideId);
  const receivingLine = lines.find((line) => line.sideId === receivingSideId);
  if (pullingLine == null || receivingLine == null) {
    throw new Error(`Resolved lines are incomplete for advanced tracking game "${game.id}".`);
  }
  const pullingLineIds = pullingLine.participantIds;
  const receivingLineIds = receivingLine.participantIds;
  const nextPointNumber = game.points.length + 1;
  const genderRatio =
    genderRatioEnabled && firstPointRatio != null
      ? getExpectedRatio(nextPointNumber, firstPointRatio)
      : undefined;
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
        lines,
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
