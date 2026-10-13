import { useState } from 'react';

import type { OffenseTapAction } from '@/components/advancedTracking/bottomCard/OffenseActions';
import type { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import type { PlayerRef } from '@/lib/advancedTracking/types';

import type { TutorialAdvancedVariant } from './tutorialNavigation';

export type TutorialAdvancedStep =
  | 'pass-to-mark'
  | 'throwaway-by-mark'
  | 'block-by-rachel'
  | 'drop-by-jules'
  | 'pressure-by-harper'
  | 'goal-to-kelly';

/** How an action was entered; each step accepts only the input it teaches. */
export type TutorialInputMethod = 'swipe' | 'button';

export type TutorialAdvancedAction =
  | { kind: 'tap'; playerId: string }
  | { kind: 'drop'; playerId: string }
  | { kind: 'throwaway'; via: TutorialInputMethod }
  | { kind: 'pressure'; playerId: string }
  | { kind: 'goal'; playerId: string; via: TutorialInputMethod };

/** Actions that arm the next player tap, like production pass modifiers. */
export type TutorialArmedModifier = 'pressure' | 'goal';

export type TutorialAdvancedResultKind = 'drop' | 'throwaway' | 'block' | 'pressure' | 'goal';

export interface TutorialAdvancedResult {
  kind: TutorialAdvancedResultKind;
  label: string;
}

export type TutorialFooterButton = 'throwaway' | 'goal';

export type TutorialAdvancedCue =
  | { target: 'chip'; playerId: string; direction: 'up' | 'down' | 'right' }
  | { target: 'footer'; button: TutorialFooterButton }
  | { target: 'more' };

interface TutorialStepDefinition {
  step: TutorialAdvancedStep;
  title: string;
  message: string;
  holderId: string | null;
  oppHasDisc: boolean;
  expectedAction: TutorialAdvancedAction;
  cue: TutorialAdvancedCue;
  /** Where to point once the step's action is armed and waiting for a player tap. */
  armedCue?: TutorialAdvancedCue;
  /** Instruction once the step's action is armed; also the correction for a wrong tap. */
  armedMessage?: string;
  result?: TutorialAdvancedResult;
}

const PASS_TO_MARK: TutorialStepDefinition = {
  step: 'pass-to-mark',
  title: 'Record a Pass',
  message: 'Kelly has the disc. Tap Mark to record a completed pass.',
  holderId: 'line-kelly',
  oppHasDisc: false,
  expectedAction: { kind: 'tap', playerId: 'line-mark' },
  cue: { target: 'chip', playerId: 'line-mark', direction: 'right' },
};

const PRESSURE_BY_HARPER: TutorialStepDefinition = {
  step: 'pressure-by-harper',
  title: 'Harper pressure D',
  message: 'Tap More, choose Pressure, then tap Harper.',
  holderId: null,
  oppHasDisc: true,
  expectedAction: { kind: 'pressure', playerId: 'line-harper' },
  cue: { target: 'more' },
  armedCue: { target: 'chip', playerId: 'line-harper', direction: 'right' },
  armedMessage: 'Now tap Harper.',
  result: { kind: 'pressure', label: 'Harper · Pressure' },
};

const BLOCK_BY_RACHEL: TutorialStepDefinition = {
  step: 'block-by-rachel',
  title: 'Rachel gets a block',
  message: 'Tap Rachel to record the block.',
  holderId: null,
  oppHasDisc: true,
  expectedAction: { kind: 'tap', playerId: 'line-rachel' },
  cue: { target: 'chip', playerId: 'line-rachel', direction: 'right' },
  result: { kind: 'block', label: 'Rachel · Block' },
};

export const TUTORIAL_ADVANCED_STEPS: Record<TutorialAdvancedVariant, TutorialStepDefinition[]> = {
  // Starts on defense so each turnover hands the disc to the other side: block (to us), throwaway
  // (to them), pressure (to us), then the goal.
  buttons: [
    {
      ...BLOCK_BY_RACHEL,
      message: 'The other team has the disc. Tap Rachel to record the block.',
    },
    {
      ...PASS_TO_MARK,
      message: 'Rachel has the disc. Tap Mark to record a completed pass.',
      holderId: 'line-rachel',
    },
    {
      step: 'throwaway-by-mark',
      title: 'Mark throws it away',
      message: 'Tap T/A to record a throwaway by Mark.',
      holderId: 'line-mark',
      oppHasDisc: false,
      expectedAction: { kind: 'throwaway', via: 'button' },
      cue: { target: 'footer', button: 'throwaway' },
      result: { kind: 'throwaway', label: 'Mark · Throwaway' },
    },
    PRESSURE_BY_HARPER,
    {
      step: 'goal-to-kelly',
      title: 'Kelly scores',
      message: 'Tap Goal, then tap Kelly to record the goal.',
      holderId: 'line-harper',
      oppHasDisc: false,
      expectedAction: { kind: 'goal', playerId: 'line-kelly', via: 'button' },
      cue: { target: 'footer', button: 'goal' },
      armedCue: { target: 'chip', playerId: 'line-kelly', direction: 'right' },
      armedMessage: 'Now tap Kelly.',
      result: { kind: 'goal', label: 'Harper + Kelly · Goal' },
    },
  ],
  gestures: [
    PASS_TO_MARK,
    {
      step: 'throwaway-by-mark',
      title: 'Mark throws it away',
      message: 'Swipe down on Mark to record a throwaway.',
      holderId: 'line-mark',
      oppHasDisc: false,
      expectedAction: { kind: 'throwaway', via: 'swipe' },
      cue: { target: 'chip', playerId: 'line-mark', direction: 'down' },
      result: { kind: 'throwaway', label: 'Mark · Throwaway' },
    },
    BLOCK_BY_RACHEL,
    {
      step: 'drop-by-jules',
      title: 'Jules drops it',
      message: 'Swipe down on Jules to record a drop.',
      holderId: 'line-rachel',
      oppHasDisc: false,
      expectedAction: { kind: 'drop', playerId: 'line-jules' },
      cue: { target: 'chip', playerId: 'line-jules', direction: 'down' },
      result: { kind: 'drop', label: 'Jules · Drop' },
    },
    PRESSURE_BY_HARPER,
    {
      step: 'goal-to-kelly',
      title: 'Kelly scores',
      message: 'Swipe up on Kelly to record the goal.',
      holderId: 'line-harper',
      oppHasDisc: false,
      expectedAction: { kind: 'goal', playerId: 'line-kelly', via: 'swipe' },
      cue: { target: 'chip', playerId: 'line-kelly', direction: 'up' },
      result: { kind: 'goal', label: 'Harper + Kelly · Goal' },
    },
  ],
};

export const TUTORIAL_ADVANCED_COMPLETION_TEXT: Record<TutorialAdvancedVariant, string> = {
  buttons:
    'Swipes work too, for quicker actions: swipe up on who scored, or down for a throwaway or drop.',
  gestures: 'Swipe up for goal, down for drops or throwaways',
};

export function isExpectedTutorialAdvancedAction(
  variant: TutorialAdvancedVariant,
  stepIndex: number,
  action: TutorialAdvancedAction,
): boolean {
  const expected = TUTORIAL_ADVANCED_STEPS[variant][stepIndex]?.expectedAction;
  if (!expected || expected.kind !== action.kind) return false;
  if ('playerId' in expected && 'playerId' in action && expected.playerId !== action.playerId) {
    return false;
  }
  if ('via' in expected && 'via' in action && expected.via !== action.via) return false;
  return true;
}

/** A player tap while an action is armed records that action for the tapped player. */
function applyArmedModifier(
  action: TutorialAdvancedAction,
  armedModifier: TutorialArmedModifier | null,
): TutorialAdvancedAction {
  if (action.kind !== 'tap' || armedModifier == null) return action;
  if (armedModifier === 'pressure') return { kind: 'pressure', playerId: action.playerId };
  return { kind: 'goal', playerId: action.playerId, via: 'button' };
}

function getPlayerId(ref: PlayerRef): string | null {
  if (ref.refType !== 'participant') return null;
  return ref.participantId;
}

export default function useTutorialAdvancedGameState(variant: TutorialAdvancedVariant) {
  const steps = TUTORIAL_ADVANCED_STEPS[variant];
  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [lastResult, setLastResult] = useState<TutorialAdvancedResult | null>(null);
  const [correctionMessage, setCorrectionMessage] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [armedModifier, setArmedModifier] = useState<TutorialArmedModifier | null>(null);
  const definition = steps[stepIndex];
  const expectedKind = definition.expectedAction.kind;
  const discHolderRef: PlayerRef | null =
    isComplete || definition.holderId == null
      ? null
      : { refType: 'participant', participantId: definition.holderId };
  const isArmed = armedModifier != null;
  const cue = isArmed && definition.armedCue ? definition.armedCue : definition.cue;
  const armedMessage = isArmed ? definition.armedMessage : undefined;
  const message = armedMessage ?? definition.message;
  const showMore = expectedKind === 'pressure' && armedModifier == null && !isComplete;

  const showCorrection = () =>
    setCorrectionMessage(armedMessage ?? `Try this step again: ${definition.message}`);

  const applyAction = (action: TutorialAdvancedAction) => {
    if (isComplete) return;
    const armedAction = applyArmedModifier(action, armedModifier);
    if (!isExpectedTutorialAdvancedAction(variant, stepIndex, armedAction)) {
      showCorrection();
      return;
    }
    setCorrectionMessage(null);
    setMoreMenuOpen(false);
    setArmedModifier(null);
    if (definition.result) setLastResult(definition.result);
    if (stepIndex === steps.length - 1) {
      setIsComplete(true);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const armModifier = (modifier: TutorialArmedModifier) => {
    if (isComplete) return;
    setMoreMenuOpen(false);
    if (expectedKind !== modifier) {
      showCorrection();
      return;
    }
    setArmedModifier(modifier);
    setCorrectionMessage(null);
  };

  const cancelModifier = () => {
    setArmedModifier(null);
    setCorrectionMessage(null);
  };

  const openMoreMenu = () => {
    if (!showMore) return;
    setMoreMenuOpen(true);
    setCorrectionMessage(null);
  };

  const closeMoreMenu = () => setMoreMenuOpen(false);

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
      if (playerId) applyAction({ kind: 'goal', playerId, via: 'swipe' });
    },
    onThrowaway: () => applyAction({ kind: 'throwaway', via: 'swipe' }),
  };

  const footerHandlers = {
    onThrowaway: () => applyAction({ kind: 'throwaway', via: 'button' }),
    onArmTapAction: (action: OffenseTapAction) => {
      // Drop is visible in the footer but not taught; it only shows the correction.
      if (action === 'goal') {
        armModifier('goal');
        return;
      }
      showCorrection();
    },
  };

  return {
    step: definition.step,
    stepIndex,
    stepCount: steps.length,
    title: definition.title,
    message,
    isComplete,
    lastResult,
    correctionMessage,
    cue,
    armedModifier,
    showMore,
    moreMenuOpen,
    openMoreMenu,
    closeMoreMenu,
    selectPressure: () => armModifier('pressure'),
    cancelModifier,
    discHolderRef,
    oppHasDisc: definition.oppHasDisc,
    handlers,
    footerHandlers,
  };
}
