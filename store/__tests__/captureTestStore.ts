import type { CaptureIntent } from '@/lib/advancedTracking/captureIntentUtils';
import {
  getCurrentPossession,
  getOtherSideId,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import type { PlayerRef, ThrowResult } from '@/lib/advancedTracking/types';
import type { AdvancedTrackingState } from '@/store/advancedTracking/trackingStore.types';

import { useAdvancedTrackingStore as liveStore } from '../advancedTracking/trackingStore';

type LegacyThrowInput = {
  thrower: PlayerRef;
  result: ThrowResult;
  toPlayer?: PlayerRef;
  defender?: PlayerRef;
  splitAttribution?: boolean;
};

function intentFromThrow(input: LegacyThrowInput): CaptureIntent {
  switch (input.result) {
    case 'complete':
      return { kind: 'pass', receiver: input.toPlayer ?? { refType: 'unknown' } };
    case 'goal':
      if (input.toPlayer == null || input.toPlayer.refType === 'untracked') {
        return { kind: 'anonymous-opponent-goal' };
      }
      return { kind: 'goal', scorer: input.toPlayer };
    case 'drop':
      if (input.toPlayer == null) throw new Error('A drop fixture requires toPlayer.');
      return input.splitAttribution
        ? { kind: 'fifty-fifty', receiver: input.toPlayer }
        : { kind: 'drop', receiver: input.toPlayer };
    case 'throwaway':
      return input.thrower.refType === 'untracked'
        ? { kind: 'anonymous-opponent-turnover' }
        : { kind: 'throwaway' };
    case 'block':
      return { kind: 'block', defender: input.defender };
    case 'pressure':
      if (input.defender == null) throw new Error('Pressure requires a tracked defender.');
      return { kind: 'pressure', defender: input.defender };
    case 'stall':
      return { kind: 'stall', defender: input.defender };
    case 'callahan':
      return {
        kind: 'callahan',
        scorer: input.defender ?? input.toPlayer ?? { refType: 'untracked' },
      };
    default:
      throw new Error(`Unsupported throw result ${(input as { result: string }).result}.`);
  }
}

function record(intent: CaptureIntent, fallbackPickup?: PlayerRef): string {
  let result = liveStore.getState().recordCaptureIntent(intent);
  if (!result.ok && result.reason === 'holder-required' && fallbackPickup != null) {
    const pickup = liveStore
      .getState()
      .recordCaptureIntent({ kind: 'pickup', player: fallbackPickup });
    if (!pickup.ok) throw new Error(`Capture rejected: ${pickup.reason}`);
    result = liveStore.getState().recordCaptureIntent(intent);
  }
  if (!result.ok) throw new Error(`Capture rejected: ${result.reason}`);
  return result.actionId;
}

function recordPickup(input: { sideId: string; player: PlayerRef }): string {
  const game = liveStore.getState().currentGame;
  if (game == null) throw new Error('No active game.');
  const possession = getCurrentPossession(game);
  const expectedSideId =
    possession && isPossessionOver(possession)
      ? getOtherSideId(game, possession.sideId)
      : possession?.sideId;
  if (expectedSideId != null && input.sideId !== expectedSideId) {
    throw new Error(`Expected pickup for side "${expectedSideId}".`);
  }
  return record({ kind: 'pickup', player: input.player });
}

type CaptureFixtureState = AdvancedTrackingState & {
  recordThrow: (input: LegacyThrowInput) => string;
  recordPickup: typeof recordPickup;
};

/** Test-only façade that expresses legacy fixture setup through semantic capture intents. */
type CaptureTestStore = Omit<typeof liveStore, 'getState'> & {
  getState: () => CaptureFixtureState;
};

export const useAdvancedTrackingStore = Object.assign({}, liveStore, {
  getState: () => ({
    ...liveStore.getState(),
    recordThrow: (input: LegacyThrowInput) => record(intentFromThrow(input), input.thrower),
    recordPickup,
  }),
}) as CaptureTestStore;
