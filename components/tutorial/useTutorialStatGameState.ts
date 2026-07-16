import { checkLineRatio, RatioCheckResult } from '@/lib/genderRatioUtils';
import { useState } from 'react';
import {
  TUTORIAL_STAT_EXPECTED_RATIO,
  TUTORIAL_STAT_INITIAL_SCORE_TEAM1,
  TUTORIAL_STAT_INITIAL_SCORE_TEAM2,
  TUTORIAL_STAT_NUM_PLAYERS,
  TUTORIAL_STAT_PRESETS,
  TUTORIAL_STAT_ROSTER,
  TUTORIAL_STAT_TEAM1_NAME,
} from './tutorialStatData';

// ── Step Definitions ─────────────────────────────────────────────────

export type TutorialStatPhase = 'scoreboard' | 'turnover-entry' | 'stat-entry' | 'line-editor';

type ExpectedAction =
  | 'start-point'
  | 'record-block'
  | 'select-blocker'
  | 'score-goal'
  | 'select-scorer'
  | 'select-assist'
  | 'select-preset'
  | 'fix-ratio'
  | 'confirm-line';

export type TooltipTarget =
  | 'action-bar'
  | 'team1'
  | 'team2'
  | 'turnover-entry'
  | 'stat-entry'
  | 'line-editor'
  | 'center';

export interface TutorialStatStepDef {
  title: string;
  message?: string;
  expectedAction: ExpectedAction;
  tooltipTarget: TooltipTarget;
  phase: TutorialStatPhase;
}

// Flow: scoreboard first (familiar), then stat entry, then line editor (new concept after scoring)
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
  // ── Line editor phase (after scoring, goes directly here — line tracking is on) ──
  {
    title: 'Set Your Line',
    message: 'Tap the D-Line preset to set a line for the next point.',
    expectedAction: 'select-preset',
    tooltipTarget: 'line-editor',
    phase: 'line-editor',
  },
  {
    title: 'Wrong Ratio',
    message: 'This is an FMP point, unselect a MMP and add a FMP to match the ratio',
    expectedAction: 'fix-ratio',
    tooltipTarget: 'line-editor',
    phase: 'line-editor',
  },
  {
    title: 'Correct Ratio',
    message: 'The ratio is now correct, tap the green confirm check to set the line.',
    expectedAction: 'confirm-line',
    tooltipTarget: 'line-editor',
    phase: 'line-editor',
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

  // Line — starts with D-Line preset already set
  const [currentLine, setCurrentLine] = useState<string[]>(INITIAL_LINE);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [ratioCheck, setRatioCheck] = useState<RatioCheckResult | null>(null);

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

  // Recalc ratio for the NEXT point (point 7 after scoring, which uses the next expected ratio)
  const recalcRatio = (line: string[]) => {
    if (line.length === 0) {
      setRatioCheck(null);
      return null;
    }
    // After scoring point 6, the line editor is for point 7 — still use the expected ratio
    const result = checkLineRatio(line, TUTORIAL_STAT_ROSTER, TUTORIAL_STAT_EXPECTED_RATIO);
    setRatioCheck(result);
    return result;
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
      // Clear line for the line editor phase (next step)
      setCurrentLine([]);
      setSelectedPresetId(null);
      setRatioCheck(null);
      advanceStep();
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = TUTORIAL_STAT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setCurrentLine(preset.playerIds);
    recalcRatio(preset.playerIds);

    if (step?.expectedAction === 'select-preset') {
      // The single preset always has the wrong ratio, so advance to fix-ratio
      advanceStep();
    }
  };

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPresetId(null);

    let newLine: string[];
    if (currentLine.includes(playerId)) {
      newLine = currentLine.filter((id) => id !== playerId);
    } else if (currentLine.length >= TUTORIAL_STAT_NUM_PLAYERS) {
      return;
    } else {
      newLine = [...currentLine, playerId];
    }

    setCurrentLine(newLine);
    const result = recalcRatio(newLine);

    // If we're on the fix-ratio step and the ratio is now correct with full line
    if (
      step?.expectedAction === 'fix-ratio' &&
      result?.isCorrect &&
      newLine.length === TUTORIAL_STAT_NUM_PLAYERS
    ) {
      advanceStep();
    }
  };

  const handleConfirmLine = () => {
    if (currentLine.length !== TUTORIAL_STAT_NUM_PLAYERS) return;
    if (ratioCheck && !ratioCheck.isCorrect) return;

    if (step?.expectedAction === 'confirm-line') {
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
    selectedPresetId,
    ratioCheck,
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
    handleSelectPreset,
    handleTogglePlayer,
    handleConfirmLine,
  };
}
