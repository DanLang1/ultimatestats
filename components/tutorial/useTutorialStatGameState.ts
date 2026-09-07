import { useState } from 'react';

import {
  TUTORIAL_STAT_INITIAL_SCORE_TEAM1,
  TUTORIAL_STAT_INITIAL_SCORE_TEAM2,
  TUTORIAL_STAT_TEAM1_NAME,
} from './tutorialStatData';

// ── Step Definitions ─────────────────────────────────────────────────

export type TutorialStatPhase = 'scoreboard' | 'turnover-entry' | 'stat-entry';

type ExpectedAction =
  | 'start-point'
  | 'record-block'
  | 'select-blocker'
  | 'score-goal'
  | 'select-scorer'
  | 'select-assist';

export type TooltipTarget =
  | 'action-bar'
  | 'team1'
  | 'team2'
  | 'turnover-entry'
  | 'stat-entry'
  | 'center';

export interface TutorialStatStepDef {
  title: string;
  message?: string;
  expectedAction: ExpectedAction;
  tooltipTarget: TooltipTarget;
  phase: TutorialStatPhase;
}

// Flow: scoreboard first, then turnover and player stat attribution.
const TUTORIAL_STAT_STEPS: TutorialStatStepDef[] = [
  // ── Scoreboard phase (start here — familiar ground) ──
  {
    title: 'Start the Point',
    message: 'Tap START POINT to begin the point timer.',
    expectedAction: 'start-point',
    tooltipTarget: 'action-bar',
    phase: 'scoreboard',
  },
  {
    title: 'Canada Has the Disc',
    message: 'Tap BLOCK on the action bar. 🥏 will flip to USA.',
    expectedAction: 'record-block',
    tooltipTarget: 'action-bar',
    phase: 'scoreboard',
  },
  // ── Turnover entry phase (who made the block?) ──
  {
    title: 'Who Made the Block?',
    message: 'Select the player who made the block.',
    expectedAction: 'select-blocker',
    tooltipTarget: 'turnover-entry',
    phase: 'turnover-entry',
  },
  {
    title: 'Score!',
    message: `USA has the disc now. Tap ${TUTORIAL_STAT_TEAM1_NAME}'s side to score.`,
    expectedAction: 'score-goal',
    tooltipTarget: 'team1',
    phase: 'scoreboard',
  },
  // ── Stat entry phase ──
  {
    title: 'Who Scored?',
    message: 'Select the player who scored the goal.',
    expectedAction: 'select-scorer',
    tooltipTarget: 'stat-entry',
    phase: 'stat-entry',
  },
  {
    title: 'Who Assisted?',
    message: 'Select the player who threw the assist.',
    expectedAction: 'select-assist',
    tooltipTarget: 'stat-entry',
    phase: 'stat-entry',
  },
];

// ── Hook ─────────────────────────────────────────────────────────────

// The initial line for point 6 (FMP) — 4 FMP + 3 MMP (correct ratio)
const INITIAL_LINE = ['f1', 'f2', 'f3', 'f4', 'm1', 'm2', 'm3'];

export default function useTutorialStatGameState(onComplete?: () => void) {
  // Phase & step
  const [currentStep, setCurrentStep] = useState(0);

  // Scores
  const [team1Score, setTeam1Score] = useState(TUTORIAL_STAT_INITIAL_SCORE_TEAM1);
  const [team2Score] = useState(TUTORIAL_STAT_INITIAL_SCORE_TEAM2);

  // Possession: opponent starts with disc
  const [possession, setPossession] = useState<'team1' | 'team2'>('team2');

  // The tutorial uses a fixed line for player attribution.
  const [currentLine] = useState<string[]>(INITIAL_LINE);
  const [pointTimerRunning, setPointTimerRunning] = useState(false);
  const [hasPointStarted, setHasPointStarted] = useState(false);

  // Turnover entry

  // Stat entry
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);

  // Derived
  const step = TUTORIAL_STAT_STEPS[currentStep];
  const phase = step?.phase ?? 'scoreboard';
  const isLastStep = currentStep === TUTORIAL_STAT_STEPS.length - 1;

  const advanceStep = () => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────

  const handleStartPoint = () => {
    setPointTimerRunning(true);
    setHasPointStarted(true);

    if (step?.expectedAction === 'start-point') {
      advanceStep();
    }
  };

  const handleBlock = () => {
    // Don't flip possession yet — turnover entry comes first
    if (step?.expectedAction === 'record-block') {
      advanceStep();
    }
  };

  const handleSelectBlocker = () => {
    setPossession('team1');

    if (step?.expectedAction === 'select-blocker') {
      advanceStep();
    }
  };

  const handleScoreGoal = () => {
    if (possession !== 'team1') return;

    setTeam1Score((s) => s + 1);
    setPointTimerRunning(false);

    if (step?.expectedAction === 'score-goal') {
      advanceStep();
    }
  };

  const handleSelectScorer = (playerId: string) => {
    setGoalScorerId(playerId);

    if (step?.expectedAction === 'select-scorer') {
      advanceStep();
    }
  };

  const handleSelectAssist = () => {
    if (step?.expectedAction === 'select-assist') {
      advanceStep();
    }
  };

  return {
    // State
    currentStep,
    step,
    phase,
    team1Score,
    team2Score,
    possession,
    currentLine,
    pointTimerRunning,
    hasPointStarted,
    goalScorerId,

    // Handlers
    handleStartPoint,
    handleBlock,
    handleSelectBlocker,
    handleScoreGoal,
    handleSelectScorer,
    handleSelectAssist,
  };
}
