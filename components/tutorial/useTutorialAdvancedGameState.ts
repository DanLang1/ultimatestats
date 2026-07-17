import { useState } from 'react';

import type { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import type { PlayerRef } from '@/lib/advancedTracking/types';

export type TutorialAdvancedStep =
  | 'pass-to-blair'
  | 'drop-by-carl'
  | 'open-rare'
  | 'stall-by-carl'
  | 'throwaway-by-carl'
  | 'block-by-blair'
  | 'goal-to-carl';

export type TutorialAdvancedAction =
  | { kind: 'tap'; playerId: string }
  | { kind: 'drop'; playerId: string }
  | { kind: 'throwaway' }
  | { kind: 'open-rare' }
  | { kind: 'goal'; playerId: string };

export type TutorialAdvancedResult = 'drop' | 'stall' | 'throwaway' | 'block' | 'goal';

interface TutorialStepDefinition {
  step: TutorialAdvancedStep;
  title: string;
  message: string;
  holderId: string | null;
  oppHasDisc: boolean;
  expectedAction: TutorialAdvancedAction;
  result?: TutorialAdvancedResult;
}

export const TUTORIAL_ADVANCED_STEPS: TutorialStepDefinition[] = [
  {
    step: 'pass-to-blair',
    title: 'Start the Point',
    message: 'Alex has the disc. Tap Blair to record a completed pass.',
    holderId: 'alex',
    oppHasDisc: false,
    expectedAction: { kind: 'tap', playerId: 'blair' },
  },
  {
    step: 'drop-by-carl',
    title: 'Carl drops it',
    message: 'Swipe down to record Carls drop',
    holderId: 'blair',
    oppHasDisc: false,
    expectedAction: { kind: 'drop', playerId: 'carl' },
    result: 'drop',
  },
  {
    step: 'open-rare',
    title: 'Carl gets it back',
    message: 'Carl forces a stall. Tap MORE for uncommon actions.',
    holderId: null,
    oppHasDisc: true,
    expectedAction: { kind: 'open-rare' },
  },
  {
    step: 'stall-by-carl',
    title: 'Carl gets it back',
    message: 'Tap Carl to credit him with a stall',
    holderId: null,
    oppHasDisc: true,
    expectedAction: { kind: 'tap', playerId: 'carl' },
    result: 'stall',
  },
  {
    step: 'throwaway-by-carl',
    title: 'Carl throws it away',
    message: 'Swipe down on Carl to record a throwaway',
    holderId: 'carl',
    oppHasDisc: false,
    expectedAction: { kind: 'throwaway' },
    result: 'throwaway',
  },
  {
    step: 'block-by-blair',
    title: 'Blair gets a block',
    message: 'Tap Blair to record the block.',
    holderId: null,
    oppHasDisc: true,
    expectedAction: { kind: 'tap', playerId: 'blair' },
    result: 'block',
  },
  {
    step: 'goal-to-carl',
    title: 'Carl scores',
    message: 'Swipe up on Carl to record the goal.',
    holderId: 'blair',
    oppHasDisc: false,
    expectedAction: { kind: 'goal', playerId: 'carl' },
    result: 'goal',
  },
];

export function isExpectedTutorialAdvancedAction(
  stepIndex: number,
  action: TutorialAdvancedAction,
): boolean {
  const expected = TUTORIAL_ADVANCED_STEPS[stepIndex]?.expectedAction;
  if (!expected || expected.kind !== action.kind) return false;
  if ('playerId' in expected && 'playerId' in action) {
    return expected.playerId === action.playerId;
  }
  return true;
}

function getPlayerId(ref: PlayerRef): string | null {
  if (ref.refType !== 'participant') return null;
  return ref.participantId;
}

export default function useTutorialAdvancedGameState() {
  const [stepIndex, setStepIndex] = useState(0);
  const [rareMenuVisible, setRareMenuVisible] = useState(false);
  const [result, setResult] = useState<TutorialAdvancedResult | null>(null);
  const [lastResult, setLastResult] = useState<TutorialAdvancedResult | null>(null);
  const definition = TUTORIAL_ADVANCED_STEPS[stepIndex];
  const discHolderRef: PlayerRef | null =
    result === 'goal' || definition.holderId == null
      ? null
      : { refType: 'participant', participantId: definition.holderId };

  const advanceImmediately = () => setStepIndex((current) => current + 1);

  const applyAction = (action: TutorialAdvancedAction) => {
    if (result != null || !isExpectedTutorialAdvancedAction(stepIndex, action)) return;

    if (action.kind === 'open-rare') {
      setRareMenuVisible(true);
      return;
    }
    if (definition.result === 'goal') {
      setResult(definition.result);
      setLastResult(definition.result);
      return;
    }
    if (definition.result) {
      setLastResult(definition.result);
    }
    advanceImmediately();
  };

  const handlers: TrackerPlayerGridHandlers = {
    onPlayerTap: (ref) => {
      const playerId = getPlayerId(ref);
      if (playerId) applyAction({ kind: 'tap', playerId });
    },
    onDrop: (ref) => {
      const playerId = getPlayerId(ref);
      if (playerId) applyAction({ kind: 'drop', playerId });
    },
    onPullDrop: () => {},
    onGoal: (ref) => {
      const playerId = getPlayerId(ref);
      if (playerId) applyAction({ kind: 'goal', playerId });
    },
    onThrowaway: () => applyAction({ kind: 'throwaway' }),
  };

  return {
    step: definition.step,
    stepIndex,
    stepCount: TUTORIAL_ADVANCED_STEPS.length,
    title: definition.title,
    message: definition.message,
    result,
    lastResult,
    discHolderRef,
    oppHasDisc: definition.oppHasDisc,
    handlers,
    rareMenuVisible,
    openRareMenu: () => applyAction({ kind: 'open-rare' }),
    closeRareMenu: () => setRareMenuVisible(false),
    selectStall: () => {
      setRareMenuVisible(false);
      advanceImmediately();
    },
  };
}
