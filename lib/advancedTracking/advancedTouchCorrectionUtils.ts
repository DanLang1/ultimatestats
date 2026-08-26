import { getOtherSideId, hasPointEnded, assertValidPointLineHistory } from './trackingUtils';
import type {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PointPossession,
  PointSub,
  PossessionAction,
  PullAction,
  ThrowAction,
  TrackedPoint,
} from './types';

function applySubToEffectiveLines(effectiveLines: Map<string, Set<string>>, sub: PointSub) {
  const line = effectiveLines.get(sub.sideId) ?? new Set<string>();
  for (const participantId of sub.outIds) line.delete(participantId);
  for (const participantId of sub.inIds) line.add(participantId);
  effectiveLines.set(sub.sideId, line);
}

/** Returns the participants active for a side immediately before the located action. */
function getActiveParticipantIdsAtAction(
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
      if (action.id === actionId) return [...(effectiveLines.get(sideId) ?? [])];
      if (action.kind === 'stoppage') {
        for (const sub of subsByStoppage.get(action.id) ?? []) {
          applySubToEffectiveLines(effectiveLines, sub);
        }
      }
    }
  }

  throw new Error(`Action "${actionId}" was not found while resolving its active lineup.`);
}

/** A stable location for a correction in the persisted point/possession/action model. */
export interface AdvancedTouchLocator {
  pointId: string;
  possessionId: string;
  touchId: string;
}

export type AdvancedStandaloneCorrectionKind = 'pull-receiver' | 'callahan-scorer';

export interface AdvancedStandaloneCorrectionLocator {
  pointId: string;
  possessionId: string;
  actionId: string;
  kind: AdvancedStandaloneCorrectionKind;
}

export type AdvancedTouchCorrectionLocator =
  | AdvancedTouchLocator
  | AdvancedStandaloneCorrectionLocator;

export type CorrectAdvancedTouchInput = AdvancedTouchCorrectionLocator & {
  participantId: string;
};

export type AdvancedTouchKind = 'pickup' | 'pass-receiver' | 'terminal-receiver';

/** One occurrence in a chain. Two occurrences with the same participant are still distinct. */
export interface AdvancedTouchOccurrence {
  touchId: string;
  kind: AdvancedTouchKind;
  sideId: string;
  currentRef: PlayerRef;
  currentParticipantId: string | null;
  /** The action whose incoming player reference is changed. */
  incomingActionId: string;
  /** The next throw whose thrower reference is changed, when this touch continues. */
  outgoingActionId?: string;
  mutatedActionIds: string[];
  eligibleParticipants: Participant[];
}

export interface AdvancedTouchCorrectionSegment {
  kind: 'touch-segment';
  point: TrackedPoint;
  possession: PointPossession;
  sideId: string;
  touches: AdvancedTouchOccurrence[];
  terminalActionId?: string;
}

export interface AdvancedStandaloneCorrectionContext {
  kind: AdvancedStandaloneCorrectionKind;
  point: TrackedPoint;
  possession: PointPossession;
  action: PullAction | ThrowAction;
  sideId: string;
  currentRef: PlayerRef | undefined;
  currentParticipantId: string | null;
  eligibleParticipants: Participant[];
}

export interface AdvancedTouchCorrectionContext {
  kind: 'touch';
  segment: AdvancedTouchCorrectionSegment;
  touch: AdvancedTouchOccurrence;
}

export type AdvancedCorrectionContext =
  | AdvancedTouchCorrectionContext
  | AdvancedStandaloneCorrectionContext;

interface LocatedAction {
  point: TrackedPoint;
  possession: PointPossession;
  action: PossessionAction;
}

function locateAction(
  game: AdvancedTrackedGame,
  locator: Pick<AdvancedStandaloneCorrectionLocator, 'pointId' | 'possessionId' | 'actionId'>,
): LocatedAction {
  const point = game.points.find((candidate) => candidate.id === locator.pointId);
  if (point == null) {
    throw new Error(`Point "${locator.pointId}" was not found in advanced game "${game.id}".`);
  }
  const possession = point.possessions.find((candidate) => candidate.id === locator.possessionId);
  if (possession == null) {
    throw new Error(`Possession "${locator.possessionId}" was not found in point "${point.id}".`);
  }
  const action = possession.actions.find((candidate) => candidate.id === locator.actionId);
  if (action == null) {
    throw new Error(`Action "${locator.actionId}" was not found in possession "${possession.id}".`);
  }
  return { point, possession, action };
}

function isSameRef(first: PlayerRef | undefined, second: PlayerRef | undefined): boolean {
  if (first == null || second == null || first.refType !== second.refType) return false;
  if (first.refType !== 'participant') return true;
  if (second.refType !== 'participant') return false;
  return first.participantId === second.participantId;
}

function participantIdForRef(ref: PlayerRef | undefined): string | null {
  if (ref?.refType !== 'participant') return null;
  return ref.participantId;
}

export function hasAlternativeParticipant(
  currentRef: PlayerRef | undefined,
  currentParticipantId: string | null,
  eligibleParticipants: Participant[],
): boolean {
  if (currentRef == null || currentRef.refType === 'untracked') return false;
  return currentParticipantId == null
    ? eligibleParticipants.length > 0
    : eligibleParticipants.some((participant) => participant.id !== currentParticipantId);
}

function getParticipantsForActionIds(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  sideId: string,
  actionIds: string[],
): Participant[] {
  if (actionIds.length === 0) return [];
  let eligibleIds: Set<string> | null = null;
  for (const actionId of actionIds) {
    const active = new Set(getActiveParticipantIdsAtAction(point, actionId, sideId));
    if (eligibleIds == null) {
      eligibleIds = active;
      continue;
    }
    eligibleIds = new Set([...eligibleIds].filter((participantId) => active.has(participantId)));
  }
  if (eligibleIds == null) return [];
  return game.participants.filter((participant) => eligibleIds.has(participant.id));
}

/** Returns participants active for every action touched by a correction. */
export function getAdvancedEligibleParticipantsForActions(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  sideId: string,
  actionIds: string[],
): Participant[] {
  return getParticipantsForActionIds(game, point, sideId, actionIds);
}

function occurrence(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  sideId: string,
  kind: AdvancedTouchKind,
  incomingActionId: string,
  currentRef: PlayerRef,
  outgoingActionId?: string,
): AdvancedTouchOccurrence {
  const mutatedActionIds = [incomingActionId];
  if (outgoingActionId != null) mutatedActionIds.push(outgoingActionId);
  return {
    touchId: `${kind}:${incomingActionId}`,
    kind,
    sideId,
    currentRef,
    currentParticipantId: participantIdForRef(currentRef),
    incomingActionId,
    outgoingActionId,
    mutatedActionIds,
    eligibleParticipants: getParticipantsForActionIds(game, point, sideId, mutatedActionIds),
  };
}

function nonStoppageActions(possession: PointPossession): PossessionAction[] {
  return possession.actions.filter((action) => action.kind !== 'stoppage');
}

function isSupportedTerminalThrow(
  action: PossessionAction,
): action is ThrowAction & { toPlayer: PlayerRef } {
  return (
    action.kind === 'throw' &&
    (action.result === 'goal' || action.result === 'drop') &&
    action.toPlayer != null
  );
}

function buildSegmentsForPossession(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  includeTurnoverSegments = false,
): AdvancedTouchCorrectionSegment[] {
  const actions = nonStoppageActions(possession);
  const segments: AdvancedTouchCorrectionSegment[] = [];
  let current: AdvancedTouchCorrectionSegment | null = null;
  let invalid = false;

  const finish = (terminalActionId?: string, isSupportedTerminal = false) => {
    if (current != null && !invalid && isSupportedTerminal) {
      current.terminalActionId = terminalActionId;
      if (
        includeTurnoverSegments ||
        current.touches.some((touch) =>
          hasAlternativeParticipant(
            touch.currentRef,
            touch.currentParticipantId,
            touch.eligibleParticipants,
          ),
        )
      ) {
        segments.push(current);
      }
    }
    current = null;
    invalid = false;
  };

  for (const action of actions) {
    if (action.kind === 'disc_pickup') {
      finish();
      current = {
        kind: 'touch-segment',
        point,
        possession,
        sideId: possession.sideId,
        touches: [occurrence(game, point, possession.sideId, 'pickup', action.id, action.player)],
      };
      continue;
    }

    if (current == null) {
      if (isSupportedTerminalThrow(action)) {
        current = {
          kind: 'touch-segment',
          point,
          possession,
          sideId: possession.sideId,
          touches: [
            occurrence(
              game,
              point,
              possession.sideId,
              'terminal-receiver',
              action.id,
              action.toPlayer,
            ),
          ],
        };
        finish(action.id, true);
      }
      continue;
    }
    if (action.kind !== 'throw') {
      finish();
      continue;
    }

    const holder = current.touches.at(-1);
    if (holder == null || !isSameRef(holder.currentRef, action.thrower)) {
      invalid = true;
      continue;
    }

    holder.outgoingActionId = action.id;
    holder.mutatedActionIds = [holder.incomingActionId, action.id];
    holder.eligibleParticipants = getParticipantsForActionIds(
      game,
      point,
      possession.sideId,
      holder.mutatedActionIds,
    );

    if (action.result === 'complete') {
      if (action.toPlayer == null) {
        invalid = true;
        continue;
      }
      current.touches.push(
        occurrence(game, point, possession.sideId, 'pass-receiver', action.id, action.toPlayer),
      );
      continue;
    }

    if (isSupportedTerminalThrow(action)) {
      current.touches.push(
        occurrence(game, point, possession.sideId, 'terminal-receiver', action.id, action.toPlayer),
      );
      finish(action.id, true);
    } else {
      finish(
        action.id,
        includeTurnoverSegments &&
          action.kind === 'throw' &&
          (action.result === 'throwaway' ||
            action.result === 'stall' ||
            action.result === 'block' ||
            action.result === 'pressure'),
      );
    }
  }

  finish();
  return segments;
}

function getCompletedPoints(game: AdvancedTrackedGame): TrackedPoint[] {
  return game.points.filter((point) => {
    if (!hasPointEnded(point)) return false;
    try {
      assertValidPointLineHistory(game, point);
      return true;
    } catch {
      return false;
    }
  });
}

function isPointEndingAction(
  point: TrackedPoint,
  possession: PointPossession,
  action: PossessionAction,
): boolean {
  const endingPossession = point.possessions.at(-1);
  const endingAction = endingPossession?.actions.findLast(
    (candidate) => candidate.kind !== 'stoppage',
  );
  return endingPossession?.id === possession.id && endingAction?.id === action.id;
}

/** Enumerates editable continuous disc-holder segments in completed points. */
export function getCorrectableAdvancedTouchSegments(
  game: AdvancedTrackedGame,
): AdvancedTouchCorrectionSegment[] {
  return getCompletedPoints(game).flatMap((point) =>
    point.possessions.flatMap((possession) => buildSegmentsForPossession(game, point, possession)),
  );
}

/** Finds the holder occurrence whose outgoing throw is a turnover action. */
export function getAdvancedTouchOccurrenceForOutgoingThrow(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  actionId: string,
): AdvancedTouchOccurrence | null {
  const segment = buildSegmentsForPossession(game, point, possession, true).find((candidate) =>
    candidate.touches.some((touch) => touch.outgoingActionId === actionId),
  );
  return segment?.touches.find((touch) => touch.outgoingActionId === actionId) ?? null;
}

/** Verifies the receiver-to-next-thrower continuity through a located throw. */
export function hasValidAdvancedTouchContinuityThroughThrow(
  possession: PointPossession,
  targetThrow: ThrowAction,
): boolean {
  let expectedThrower: PlayerRef | undefined;
  let hasBrokenContinuity = false;

  for (const action of nonStoppageActions(possession)) {
    if (action.id === targetThrow.id) {
      const targetMatchesExpectedThrower =
        expectedThrower == null || isSameRef(expectedThrower, targetThrow.thrower);
      return !hasBrokenContinuity && targetMatchesExpectedThrower;
    }

    if (action.kind === 'disc_pickup') {
      expectedThrower = action.player;
      hasBrokenContinuity = false;
      continue;
    }
    if (action.kind !== 'throw') continue;
    if (expectedThrower == null) continue;

    if (!isSameRef(expectedThrower, action.thrower)) {
      hasBrokenContinuity = true;
      continue;
    }

    if (action.result === 'complete' && action.toPlayer != null) {
      expectedThrower = action.toPlayer;
    } else {
      expectedThrower = undefined;
      hasBrokenContinuity = false;
    }
  }

  throw new Error(`Throw "${targetThrow.id}" was not found while validating touch continuity.`);
}

function buildPullContext(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  action: PullAction,
): AdvancedStandaloneCorrectionContext {
  const currentRef = action.receiver;
  return {
    kind: 'pull-receiver',
    point,
    possession,
    action,
    sideId: action.receivingSideId,
    currentRef,
    currentParticipantId: participantIdForRef(currentRef),
    eligibleParticipants: getParticipantsForActionIds(game, point, action.receivingSideId, [
      action.id,
    ]),
  };
}

function buildCallahanContext(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  action: ThrowAction,
): AdvancedStandaloneCorrectionContext {
  const sideId = getOtherSideId(game, possession.sideId);
  const currentRef = action.defender ?? action.toPlayer;
  return {
    kind: 'callahan-scorer',
    point,
    possession,
    action,
    sideId,
    currentRef,
    currentParticipantId: participantIdForRef(currentRef),
    eligibleParticipants: getParticipantsForActionIds(game, point, sideId, [action.id]),
  };
}

/** Enumerates pull-receiver and Callahan-scoring attributions with a valid replacement. */
export function getCorrectableAdvancedStandaloneContexts(
  game: AdvancedTrackedGame,
): AdvancedStandaloneCorrectionContext[] {
  const contexts: AdvancedStandaloneCorrectionContext[] = [];
  for (const point of getCompletedPoints(game)) {
    for (const possession of point.possessions) {
      for (const action of possession.actions) {
        try {
          if (action.kind === 'pull' && action.receiver != null) {
            const context = buildPullContext(game, point, possession, action);
            if (
              hasAlternativeParticipant(
                context.currentRef,
                context.currentParticipantId,
                context.eligibleParticipants,
              )
            ) {
              contexts.push(context);
            }
          }
          if (
            action.kind === 'throw' &&
            action.result === 'callahan' &&
            isPointEndingAction(point, possession, action)
          ) {
            const context = buildCallahanContext(game, point, possession, action);
            if (
              hasAlternativeParticipant(
                context.currentRef,
                context.currentParticipantId,
                context.eligibleParticipants,
              )
            ) {
              contexts.push(context);
            }
          }
        } catch {
          // Imported or partially tracked records remain readable but are not editable.
        }
      }
    }
  }
  return contexts;
}

/** Returns all editable chain and standalone contexts. */
export function getCorrectableAdvancedTouchContexts(
  game: AdvancedTrackedGame,
): AdvancedCorrectionContext[] {
  const contexts: AdvancedCorrectionContext[] = [];
  for (const segment of getCorrectableAdvancedTouchSegments(game)) {
    for (const touch of segment.touches) {
      if (
        hasAlternativeParticipant(
          touch.currentRef,
          touch.currentParticipantId,
          touch.eligibleParticipants,
        )
      ) {
        contexts.push({ kind: 'touch', segment, touch });
      }
    }
  }
  contexts.push(...getCorrectableAdvancedStandaloneContexts(game));
  return contexts;
}

function findSegmentTouch(
  game: AdvancedTrackedGame,
  locator: AdvancedTouchLocator,
): AdvancedTouchCorrectionContext {
  const segment = getCorrectableAdvancedTouchSegments(game).find(
    (candidate) =>
      candidate.point.id === locator.pointId &&
      candidate.possession.id === locator.possessionId &&
      candidate.touches.some((touch) => touch.touchId === locator.touchId),
  );
  const touch = segment?.touches.find((candidate) => candidate.touchId === locator.touchId);
  if (segment == null || touch == null) {
    throw new Error(`Touch "${locator.touchId}" is not correctable.`);
  }
  return { kind: 'touch', segment, touch };
}

/** Resolves a selected occurrence or standalone attribution into its correction context. */
export function getAdvancedTouchCorrectionContext(
  game: AdvancedTrackedGame,
  locator: AdvancedTouchCorrectionLocator,
): AdvancedCorrectionContext {
  if ('touchId' in locator) return findSegmentTouch(game, locator);

  const { point, possession, action } = locateAction(game, locator);
  if (!hasPointEnded(point)) throw new Error('Only completed points can be corrected.');
  try {
    assertValidPointLineHistory(game, point);
  } catch {
    throw new Error(`Point "${point.id}" has invalid lineup history and cannot be corrected.`);
  }
  if (locator.kind === 'pull-receiver') {
    if (action.kind !== 'pull' || action.receiver == null) {
      throw new Error(`Action "${action.id}" has no pull receiver to correct.`);
    }
    return buildPullContext(game, point, possession, action);
  }
  if (action.kind !== 'throw' || action.result !== 'callahan') {
    throw new Error(`Action "${action.id}" is not a Callahan.`);
  }
  if (!isPointEndingAction(point, possession, action)) {
    throw new Error(`Callahan "${action.id}" did not end point "${point.id}".`);
  }
  const context = buildCallahanContext(game, point, possession, action);
  if (context.currentRef == null || context.currentRef.refType === 'untracked') {
    throw new Error(`Action "${action.id}" has no correctable Callahan scorer.`);
  }
  return context;
}

function replaceRef(ref: PlayerRef | undefined, participantId: string): PlayerRef {
  if (ref == null) throw new Error('The selected correction field is not present.');
  return { refType: 'participant', participantId };
}

function replaceTouchAction(
  action: PossessionAction,
  occurrenceToReplace: AdvancedTouchOccurrence,
  participantId: string,
): PossessionAction {
  if (action.id === occurrenceToReplace.incomingActionId) {
    if (action.kind === 'disc_pickup')
      return { ...action, player: replaceRef(action.player, participantId) };
    if (action.kind === 'throw')
      return { ...action, toPlayer: replaceRef(action.toPlayer, participantId) };
  }
  if (action.id === occurrenceToReplace.outgoingActionId && action.kind === 'throw') {
    return { ...action, thrower: replaceRef(action.thrower, participantId) };
  }
  return action;
}

function correctStandalone(
  game: AdvancedTrackedGame,
  context: AdvancedStandaloneCorrectionContext,
  participantId: string,
): AdvancedTrackedGame {
  const participant = context.eligibleParticipants.find(
    (candidate) => candidate.id === participantId,
  );
  if (participant == null) {
    throw new Error('The selected participant was not active for every corrected action.');
  }
  let correctedAction: PossessionAction;
  if (context.kind === 'pull-receiver') {
    if (context.action.kind !== 'pull') throw new Error('Expected a pull correction action.');
    correctedAction = {
      ...context.action,
      receiver: replaceRef(context.action.receiver, participant.id),
    };
  } else {
    if (context.action.kind !== 'throw') throw new Error('Expected a Callahan correction action.');
    if (context.action.defender != null) {
      const { toPlayer: _toPlayer, ...actionWithoutReceiver } = context.action;
      correctedAction = {
        ...actionWithoutReceiver,
        defender: replaceRef(context.action.defender, participant.id),
      };
    } else {
      const { defender: _defender, ...actionWithoutDefender } = context.action;
      correctedAction = {
        ...actionWithoutDefender,
        toPlayer: replaceRef(context.action.toPlayer, participant.id),
      };
    }
  }
  return mapPossessionActions(game, context.point.id, context.possession.id, (action) =>
    action.id === correctedAction.id ? correctedAction : action,
  );
}

function mapPossessionActions(
  game: AdvancedTrackedGame,
  pointId: string,
  possessionId: string,
  mapAction: (action: PossessionAction) => PossessionAction,
): AdvancedTrackedGame {
  const points = game.points.map((point) => {
    if (point.id !== pointId) return point;

    const possessions = point.possessions.map((possession) => {
      if (possession.id !== possessionId) return possession;

      return {
        ...possession,
        actions: possession.actions.map(mapAction),
      };
    });

    return { ...point, possessions };
  });

  return {
    ...game,
    updatedAt: Date.now(),
    points,
  };
}

/** Applies one identity correction without changing action order, outcomes, timing, or metadata. */
export function correctAdvancedTouch(
  game: AdvancedTrackedGame,
  input: CorrectAdvancedTouchInput,
): AdvancedTrackedGame {
  const context = getAdvancedTouchCorrectionContext(game, input);
  if (context.kind !== 'touch') return correctStandalone(game, context, input.participantId);

  const participant = context.touch.eligibleParticipants.find(
    (candidate) => candidate.id === input.participantId,
  );
  if (participant == null) {
    throw new Error('The selected participant was not active for every corrected action.');
  }
  return mapPossessionActions(
    game,
    context.segment.point.id,
    context.segment.possession.id,
    (action) => replaceTouchAction(action, context.touch, participant.id),
  );
}
