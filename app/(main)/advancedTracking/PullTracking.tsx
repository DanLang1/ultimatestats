import { PullDropperStep } from '@/components/advancedTracking/pullTracker/PullDropperStep';
import { PullResultStep } from '@/components/advancedTracking/pullTracker/PullResultStep';
import { PullTimingStep } from '@/components/advancedTracking/pullTracker/PullTimingStep';
import {
  buildRecordPullInput,
  getFlowParticipants,
} from '@/lib/advancedTracking/pullTrackingUtils';
import { PullResult } from '@/lib/advancedTracking/types';
import { GenderRatio } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

type Step =
  | { name: 'timing' }
  | { name: 'result'; pullerId: string | null | undefined; hangTimeMs: number }
  | { name: 'dropper'; pullerId: string | null | undefined; hangTimeMs: number };

export default function PullTrackingScreen() {
  const {
    isOurPull: isOurPullParam,
    lineParticipantIds: idsParam,
    genderRatio: genderRatioParam,
  } = useLocalSearchParams<{
    isOurPull: string;
    lineParticipantIds: string;
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

  const activeParticipants = getFlowParticipants(game, lineParticipantIds);

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
        activeParticipants={activeParticipants}
        onNext={(pullerId, hangTimeMs) => {
          if (!isOurPull) {
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
      activeParticipants={activeParticipants}
      onComplete={(receiverId) =>
        handleComplete('dropped', step.pullerId, step.hangTimeMs, receiverId)
      }
      onBack={() =>
        setStep({ name: 'result', pullerId: step.pullerId, hangTimeMs: step.hangTimeMs })
      }
    />
  );
}
