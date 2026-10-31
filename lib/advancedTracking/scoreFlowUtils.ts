import { getAnalyticsOpposingSideId } from './analyticsPerspectiveUtils';
import type { AnalyticsGame, PointState } from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';

/** A scored point from the perspective side's view. */
export type ScoreFlowOutcome = Exclude<PointState, 'terminated' | 'in_progress'>;

export interface ScoreFlowStep {
  outcome: ScoreFlowOutcome;
  /** Perspective side's score minus the opponent's, after this point. */
  margin: number;
}

export interface ScoreFlowHalftime {
  myScore: number;
  opponentScore: number;
}

export interface ScoreFlow {
  steps: ScoreFlowStep[];
  /** Null until the first second-half point starts. */
  halftime: ScoreFlowHalftime | null;
  biggestLead: number;
  /** Times the lead passed from one side to the other, ties in between allowed. */
  leadChanges: number;
}

/** Point-by-point score margin for one game. Unfinished points are skipped. */
export function computeScoreFlow(game: AnalyticsGame, perspectiveSideId: string): ScoreFlow {
  const steps: ScoreFlowStep[] = [];
  let margin = 0;
  let biggestLead = 0;
  let leadChanges = 0;
  let leaderSign = 0;

  for (const point of game.points) {
    const state = getPointStateForSide(point, perspectiveSideId);
    if (state === 'terminated' || state === 'in_progress') continue;

    margin += state === 'hold' || state === 'break' ? 1 : -1;
    steps.push({ outcome: state, margin });
    biggestLead = Math.max(biggestLead, margin);

    const sign = Math.sign(margin);
    if (sign !== 0) {
      if (leaderSign !== 0 && sign !== leaderSign) leadChanges++;
      leaderSign = sign;
    }
  }

  // The first second-half point records the score it started from, even while it's still live.
  const firstSecondHalfPoint = game.points.find((point) => point.half === 2);
  const opposingSideId = getAnalyticsOpposingSideId(game, perspectiveSideId);
  const halftime = firstSecondHalfPoint
    ? {
        myScore: firstSecondHalfPoint.scoresBySide[perspectiveSideId],
        opponentScore: firstSecondHalfPoint.scoresBySide[opposingSideId],
      }
    : null;

  return { steps, halftime, biggestLead, leadChanges };
}
