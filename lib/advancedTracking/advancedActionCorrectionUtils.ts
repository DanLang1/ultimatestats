import { assertValidPointLineHistory, getOtherSideId } from './trackingUtils';
import type {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PointPossession,
  PointSub,
  PossessionAction,
  ThrowAction,
  TrackedPoint,
} from './types';

export interface AdvancedActionLocator {
  pointId: string;
  possessionId: string;
  actionId: string;
}

export interface CorrectAdvancedGoalScorerInput extends AdvancedActionLocator {
  participantId: string;
}

export interface AdvancedGoalScorerCorrectionContext {
  point: TrackedPoint;
  possession: PointPossession;
  action: ThrowAction;
  scoringSideId: string;
  scoringSideLabel: string;
  currentScorerParticipantId: string | null;
  eligibleParticipants: Participant[];
}

interface LocatedAdvancedAction {
  point: TrackedPoint;
  possession: PointPossession;
  action: PossessionAction;
}

interface PointScoringAction {
  possession: PointPossession;
  action: ThrowAction;
}

function locateAction(
  game: AdvancedTrackedGame,
  locator: AdvancedActionLocator,
): LocatedAdvancedAction {
  const point = game.points.find((candidate) => candidate.id === locator.pointId);
  if (point == null) {
    throw new Error(`Point "${locator.pointId}" was not found in advanced game "${game.id}".`);
  }

  const possession = point.possessions.find((candidate) => candidate.id === locator.possessionId);
  if (possession == null) {
    throw new Error(
      `Possession "${locator.possessionId}" was not found in point "${locator.pointId}".`,
    );
  }

  const action = possession.actions.find((candidate) => candidate.id === locator.actionId);
  if (action == null) {
    throw new Error(
      `Action "${locator.actionId}" was not found in possession "${locator.possessionId}".`,
    );
  }

  return { point, possession, action };
}

function applySubToEffectiveLines(effectiveLines: Map<string, Set<string>>, sub: PointSub) {
  const line = effectiveLines.get(sub.sideId) ?? new Set<string>();
  for (const participantId of sub.outIds) line.delete(participantId);
  for (const participantId of sub.inIds) line.add(participantId);
  effectiveLines.set(sub.sideId, line);
}

/** Returns the participants active for a side immediately before the located action. */
export function getActiveParticipantIdsAtAction(
  point: TrackedPoint,
  actionId: string,
  sideId: string,
): string[] {
  const effectiveLines = new Map(
    point.lines.map((line) => [line.sideId, new Set(line.participantIds)]),
  );
  const subsByStoppage = new Map<string, PointSub[]>();
  for (const sub of point.subs ?? []) {
    const stoppageSubs = subsByStoppage.get(sub.stoppageActionId) ?? [];
    stoppageSubs.push(sub);
    subsByStoppage.set(sub.stoppageActionId, stoppageSubs);
  }

  for (const possession of point.possessions) {
    for (const action of possession.actions) {
      if (action.id === actionId) {
        return [...(effectiveLines.get(sideId) ?? [])];
      }
      if (action.kind === 'stoppage') {
        for (const sub of subsByStoppage.get(action.id) ?? []) {
          applySubToEffectiveLines(effectiveLines, sub);
        }
      }
    }
  }

  throw new Error(`Action "${actionId}" was not found while resolving its active lineup.`);
}

function getScorerRef(action: ThrowAction): PlayerRef | undefined {
  if (action.result === 'goal') return action.toPlayer;
  if (action.result === 'callahan') return action.defender ?? action.toPlayer;
  return undefined;
}

function getScoringSideId(
  game: AdvancedTrackedGame,
  possession: PointPossession,
  action: ThrowAction,
): string {
  return action.result === 'callahan' ? getOtherSideId(game, possession.sideId) : possession.sideId;
}

function getPointScoringAction(point: TrackedPoint): PointScoringAction | null {
  const possession = point.possessions.at(-1);
  const action = possession?.actions.findLast((candidate) => candidate.kind !== 'stoppage');
  if (
    possession == null ||
    action?.kind !== 'throw' ||
    (action.result !== 'goal' && action.result !== 'callahan')
  ) {
    return null;
  }

  return { possession, action };
}

function assertActionEndsPoint(
  point: TrackedPoint,
  possession: PointPossession,
  action: PossessionAction,
) {
  const scoringAction = getPointScoringAction(point);
  if (scoringAction?.possession.id !== possession.id || scoringAction.action.id !== action.id) {
    throw new Error('Only the scoring action that ended a point can have its scorer corrected.');
  }
}

function buildGoalScorerCorrectionContext(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  action: ThrowAction,
): AdvancedGoalScorerCorrectionContext {
  const scoringSideId = getScoringSideId(game, possession, action);
  const scoringSideLabel =
    game.sides.find((side) => side.id === scoringSideId)?.label ?? scoringSideId;
  const activeParticipantIds = new Set(
    getActiveParticipantIdsAtAction(point, action.id, scoringSideId),
  );
  // Touch capture permits a self-goal; correction must offer that same on-field participant.
  const eligibleParticipants = game.participants.filter((participant) =>
    activeParticipantIds.has(participant.id),
  );
  const scorerRef = getScorerRef(action);

  return {
    point,
    possession,
    action,
    scoringSideId,
    scoringSideLabel,
    currentScorerParticipantId:
      scorerRef?.refType === 'participant' ? scorerRef.participantId : null,
    eligibleParticipants,
  };
}

export function getAdvancedGoalScorerCorrectionContext(
  game: AdvancedTrackedGame,
  locator: AdvancedActionLocator,
): AdvancedGoalScorerCorrectionContext {
  const { point, possession, action } = locateAction(game, locator);
  if (action.kind !== 'throw' || (action.result !== 'goal' && action.result !== 'callahan')) {
    throw new Error(`Action "${action.id}" is not a goal or Callahan.`);
  }
  assertActionEndsPoint(point, possession, action);
  assertValidPointLineHistory(game, point);

  return buildGoalScorerCorrectionContext(game, point, possession, action);
}

export function getCorrectableAdvancedGoalContexts(
  game: AdvancedTrackedGame,
): AdvancedGoalScorerCorrectionContext[] {
  const contexts: AdvancedGoalScorerCorrectionContext[] = [];

  for (const point of game.points) {
    const scoringAction = getPointScoringAction(point);
    if (scoringAction == null) continue;

    try {
      assertValidPointLineHistory(game, point);
    } catch {
      // Stored and imported games can predate current line-history invariants. Their timeline
      // remains readable, but unsafe points are intentionally unavailable for correction.
      continue;
    }

    const context = buildGoalScorerCorrectionContext(
      game,
      point,
      scoringAction.possession,
      scoringAction.action,
    );
    if (
      context.eligibleParticipants.some(
        (participant) => participant.id !== context.currentScorerParticipantId,
      )
    ) {
      contexts.push(context);
    }
  }

  return contexts;
}

function withCorrectedScorer(action: ThrowAction, participantId: string): ThrowAction {
  const scorer: PlayerRef = { refType: 'participant', participantId };
  if (action.result === 'goal') {
    return { ...action, toPlayer: scorer };
  }

  // Two-sided tracking stores the Callahan scorer as the defender; single-team tracking stores
  // a focus-side Callahan scorer as toPlayer. Keep exactly the field used by the captured action.
  if (action.defender != null) {
    const { toPlayer: _toPlayer, ...rest } = action;
    return { ...rest, defender: scorer };
  }

  const { defender: _defender, ...rest } = action;
  return { ...rest, toPlayer: scorer };
}

export function correctAdvancedGoalScorer(
  game: AdvancedTrackedGame,
  input: CorrectAdvancedGoalScorerInput,
): AdvancedTrackedGame {
  const context = getAdvancedGoalScorerCorrectionContext(game, input);
  const participant = context.eligibleParticipants.find(
    (candidate) => candidate.id === input.participantId,
  );
  if (participant == null) {
    throw new Error(
      'The selected scorer was not active for the scoring side when this action occurred.',
    );
  }

  const correctedAction = withCorrectedScorer(context.action, participant.id);
  const correctedPossession: PointPossession = {
    ...context.possession,
    actions: context.possession.actions.map((action) =>
      action.id === correctedAction.id ? correctedAction : action,
    ),
  };
  const correctedPoint: TrackedPoint = {
    ...context.point,
    possessions: context.point.possessions.map((possession) =>
      possession.id === correctedPossession.id ? correctedPossession : possession,
    ),
  };
  const correctedGame: AdvancedTrackedGame = {
    ...game,
    updatedAt: Date.now(),
    points: game.points.map((point) => (point.id === correctedPoint.id ? correctedPoint : point)),
  };

  return correctedGame;
}
