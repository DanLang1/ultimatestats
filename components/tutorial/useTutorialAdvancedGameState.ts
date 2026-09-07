import { useState } from 'react';

import type { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import type { PlayerRef } from '@/lib/advancedTracking/types';

export type TutorialAdvancedStep =
  | 'pass-to-mark'
  | 'throwaway-by-mark'
  | 'block-by-rachel'
  | 'drop-by-jules'
  | 'pressure-by-harper'
  | 'goal-to-kelly';

export type TutorialAdvancedAction =
  | { kind: 'tap'; playerId: string }
  | { kind: 'drop'; playerId: string }
  | { kind: 'throwaway' }
  | { kind: 'pressure'; playerId: string }
  | { kind: 'goal'; playerId: string };

export type TutorialAdvancedResult = 'drop' | 'throwaway' | 'block' | 'pressure' | 'goal';

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
    step: 'pass-to-mark',
    title: 'Record a Pass',
    message: 'Kelly has the disc. Tap Mark to record a completed pass.',
    holderId: 'line-kelly',
    oppHasDisc: false,
    expectedAction: { kind: 'tap', playerId: 'line-mark' },
  },
  {
    step: 'throwaway-by-mark',
    title: 'Mark throws it away',
    message: 'Swipe down on Mark to record a throwaway.',
    holderId: 'line-mark',
    oppHasDisc: false,
    expectedAction: { kind: 'throwaway' },
    result: 'throwaway',
  },
  {
    step: 'block-by-rachel',
    title: 'Rachel gets a block',
    message: 'Tap Rachel to record the block.',
    holderId: null,
    oppHasDisc: true,
    expectedAction: { kind: 'tap', playerId: 'line-rachel' },
    result: 'block',
  },
  {
    step: 'drop-by-jules',
    title: 'Jules drops it',
    message: 'Swipe down on Jules to record a drop.',
    holderId: 'line-rachel',
    oppHasDisc: false,
    expectedAction: { kind: 'drop', playerId: 'line-jules' },
    result: 'drop',
  },
  {
    step: 'pressure-by-harper',
    title: 'Harper pressure D',
    message: 'Tap More, choose Pressure, then tap Harper.',
    holderId: null,
    oppHasDisc: true,
    expectedAction: { kind: 'pressure', playerId: 'line-harper' },
    result: 'pressure',
  },
  {
    step: 'goal-to-kelly',
    title: 'Kelly scores',
    message: 'Swipe up on Kelly to record the goal.',
    holderId: 'line-harper',
    oppHasDisc: false,
    expectedAction: { kind: 'goal', playerId: 'line-kelly' },
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
  const [result, setResult] = useState<TutorialAdvancedResult | null>(null);
  const [lastResult, setLastResult] = useState<TutorialAdvancedResult | null>(null);
  const [correctionMessage, setCorrectionMessage] = useState<string | null>(null);
  const [pressureMenuOpen, setPressureMenuOpen] = useState(false);
  const [pressureArmed, setPressureArmed] = useState(false);
  const definition = TUTORIAL_ADVANCED_STEPS[stepIndex];
  const discHolderRef: PlayerRef | null =
    result === 'goal' || definition.holderId == null
      ? null
      : { refType: 'participant', participantId: definition.holderId };

  const advanceImmediately = () => setStepIndex((current) => current + 1);

  const applyAction = (action: TutorialAdvancedAction) => {
    if (result != null) return;
    if (definition.step === 'pressure-by-harper' && action.kind === 'tap') {
      if (!pressureArmed) {
        setCorrectionMessage('Tap More, choose Pressure, then tap Harper.');
        return;
      }
      action = { kind: 'pressure', playerId: action.playerId };
    }
    if (!isExpectedTutorialAdvancedAction(stepIndex, action)) {
      setCorrectionMessage(`Try this step again: ${definition.message}`);
      return;
    }
    setCorrectionMessage(null);
    setPressureMenuOpen(false);
    setPressureArmed(false);
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

  const openPressureMenu = () => {
    if (definition.step !== 'pressure-by-harper' || result != null) return;
    setPressureMenuOpen(true);
    setCorrectionMessage(null);
  };

  const closePressureMenu = () => setPressureMenuOpen(false);

  const selectPressure = () => {
    if (definition.step !== 'pressure-by-harper' || result != null) return;
    setPressureMenuOpen(false);
    setPressureArmed(true);
    setCorrectionMessage(null);
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
    correctionMessage,
    pressureArmed,
    pressureMenuOpen,
    openPressureMenu,
    selectPressure,
    closePressureMenu,
    discHolderRef,
    oppHasDisc: definition.oppHasDisc,
    handlers,
  };
}
