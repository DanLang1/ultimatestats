import {
  getAdvancedEligibleParticipantsForActions,
  getAdvancedTouchOccurrenceForOutgoingThrow,
  hasValidAdvancedTouchContinuityThroughThrow,
  type AdvancedTouchOccurrence,
} from './advancedTouchCorrectionUtils';
import {
  assertValidPointLineHistory,
  getOtherSideId,
  hasPointEnded,
  isTurnoverThrow,
} from './trackingUtils';
import type {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PossessionAction,
  PointPossession,
  ThrowAction,
  ThrowType,
  TrackedPoint,
} from './types';
import { getEligibleThrowTypes } from './types';

export const ADVANCED_TURNOVER_EDITOR_RESULTS = [
  'drop',
  'fifty-fifty',
  'throwaway',
  'block',
  'pressure',
  'stall',
] as const;

export type AdvancedTurnoverEditorResult = (typeof ADVANCED_TURNOVER_EDITOR_RESULTS)[number];

export interface AdvancedTurnoverCorrectionLocator {
  pointId: string;
  possessionId: string;
  actionId: string;
}

export type CorrectAdvancedTurnoverInput = AdvancedTurnoverCorrectionLocator & {
  result: AdvancedTurnoverEditorResult;
  /** A participant ID replaces the current holder; omitted preserves the current reference. */
  throwerParticipantId?: string;
  /** Null preserves an intentionally untracked role; an ID selects a tracked participant. */
  receiverParticipantId?: string | null;
  defenderParticipantId?: string | null;
  throwType?: ThrowType;
};

export interface AdvancedTurnoverParticipantField {
  sideId: string;
  isFullRoster: boolean;
  currentRef: PlayerRef | undefined;
  currentParticipantId: string | null;
  eligibleParticipants: Participant[];
}

export interface AdvancedTurnoverCorrectionContext {
  kind: 'turnover';
  point: TrackedPoint;
  possession: PointPossession;
  action: ThrowAction;
  holderTouch: AdvancedTouchOccurrence | null;
  thrower: AdvancedTurnoverParticipantField;
  receiver: AdvancedTurnoverParticipantField;
  defender: AdvancedTurnoverParticipantField;
  availableResults: AdvancedTurnoverEditorResult[];
  currentResult: AdvancedTurnoverEditorResult;
  currentThrowType?: ThrowType;
  eligibleThrowTypes: readonly ThrowType[];
  canClassify: boolean;
}

function participantIdForRef(ref: PlayerRef | undefined): string | null {
  return ref?.refType === 'participant' ? ref.participantId : null;
}

function locateTurnoverAction(
  game: AdvancedTrackedGame,
  locator: AdvancedTurnoverCorrectionLocator,
): { point: TrackedPoint; possession: PointPossession; action: ThrowAction } {
  const point = game.points.find((candidate) => candidate.id === locator.pointId);
  if (point == null) throw new Error(`Point "${locator.pointId}" was not found.`);
  const possession = point.possessions.find((candidate) => candidate.id === locator.possessionId);
  if (possession == null) throw new Error(`Possession "${locator.possessionId}" was not found.`);
  const action = possession.actions.find((candidate) => candidate.id === locator.actionId);
  if (action?.kind !== 'throw') {
    throw new Error(`Action "${locator.actionId}" is not a throw.`);
  }
  if (!isTurnoverThrow(action.result)) {
    throw new Error(`Action "${locator.actionId}" is not an editable turnover.`);
  }
  return { point, possession, action };
}

function assertCanonicalTurnoverAction(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  action: ThrowAction,
): void {
  const lastNonStoppageAction = possession.actions.findLast(
    (candidate) => candidate.kind !== 'stoppage',
  );
  if (lastNonStoppageAction?.id !== action.id) {
    throw new Error(`Action "${action.id}" is not the terminal action of its possession.`);
  }
  if (action.sideId !== possession.sideId) {
    throw new Error(`Action "${action.id}" does not match its possession side.`);
  }

  const possessionIndex = point.possessions.findIndex(
    (candidate) => candidate.id === possession.id,
  );
  const followingPossession = point.possessions[possessionIndex + 1];
  if (followingPossession?.sideId !== getOtherSideId(game, possession.sideId)) {
    throw new Error(`Action "${action.id}" is not followed by the opposing possession.`);
  }
}

function isFullRosterSide(game: AdvancedTrackedGame, sideId: string): boolean {
  return game.sides.find((side) => side.id === sideId)?.trackingMode === 'full-roster';
}

function field(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  sideId: string,
  currentRef: PlayerRef | undefined,
  actionIds: string[],
): AdvancedTurnoverParticipantField {
  return {
    sideId,
    isFullRoster: isFullRosterSide(game, sideId),
    currentRef,
    currentParticipantId: participantIdForRef(currentRef),
    eligibleParticipants: getAdvancedEligibleParticipantsForActions(game, point, sideId, actionIds),
  };
}

function currentResult(action: ThrowAction): AdvancedTurnoverEditorResult {
  if (action.result === 'drop' && action.splitAttribution === true) return 'fifty-fifty';
  if (action.result === 'drop') return 'drop';
  if (
    action.result === 'throwaway' ||
    action.result === 'stall' ||
    action.result === 'block' ||
    action.result === 'pressure'
  ) {
    return action.result;
  }
  throw new Error(`Throw result "${action.result}" is not an editable turnover.`);
}

function hasConfigurableRole(
  role: AdvancedTurnoverParticipantField,
  result: AdvancedTurnoverEditorResult,
  isThrowingSide: boolean,
): boolean {
  if (result === 'throwaway') return true;
  const requiresTrackedDefender = result === 'pressure';
  if (requiresTrackedDefender) return role.eligibleParticipants.length > 0;
  if (role.currentRef?.refType === 'untracked') return true;
  if (!role.isFullRoster) return !isThrowingSide;
  return role.eligibleParticipants.length > 0;
}

function getResultRole(
  result: AdvancedTurnoverEditorResult,
  receiver: AdvancedTurnoverParticipantField,
  defender: AdvancedTurnoverParticipantField,
): AdvancedTurnoverParticipantField | null {
  if (result === 'drop' || result === 'fifty-fifty') return receiver;
  if (result === 'block' || result === 'pressure' || result === 'stall') return defender;
  return null;
}

function hasAlternativeParticipant(
  fieldValue: AdvancedTurnoverParticipantField,
  allowUntracked: boolean,
): boolean {
  if (fieldValue.currentRef?.refType === 'untracked') return false;
  if (fieldValue.currentParticipantId == null) return fieldValue.eligibleParticipants.length > 0;
  return (
    fieldValue.eligibleParticipants.some(
      (participant) => participant.id !== fieldValue.currentParticipantId,
    ) ||
    (allowUntracked && fieldValue.currentRef?.refType === 'unknown')
  );
}

function hasAlternativeThrowType(
  current: ThrowType | undefined,
  eligible: readonly ThrowType[],
): boolean {
  if (eligible.length === 0) return current != null;
  return current == null || eligible.some((type) => type !== current);
}

function getThrowerField(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  possession: PointPossession,
  action: ThrowAction,
  holderTouch: AdvancedTouchOccurrence | null,
) {
  if (holderTouch != null) {
    return {
      sideId: possession.sideId,
      isFullRoster: isFullRosterSide(game, possession.sideId),
      currentRef: action.thrower,
      currentParticipantId: participantIdForRef(action.thrower),
      eligibleParticipants: holderTouch.eligibleParticipants,
    } satisfies AdvancedTurnoverParticipantField;
  }
  return field(game, point, possession.sideId, action.thrower, [action.id]);
}

/** Builds the completed-point editor context for a canonical turnover throw. */
export function getAdvancedTurnoverCorrectionContext(
  game: AdvancedTrackedGame,
  locator: AdvancedTurnoverCorrectionLocator,
): AdvancedTurnoverCorrectionContext {
  const { point, possession, action } = locateTurnoverAction(game, locator);
  if (!hasPointEnded(point)) throw new Error('Only completed points can be corrected.');
  assertCanonicalTurnoverAction(game, point, possession, action);
  try {
    assertValidPointLineHistory(game, point);
  } catch {
    throw new Error(`Point "${point.id}" has invalid lineup history and cannot be corrected.`);
  }
  if (!hasValidAdvancedTouchContinuityThroughThrow(possession, action)) {
    throw new Error(`Action "${action.id}" has invalid holder continuity and cannot be corrected.`);
  }

  const holderTouch = getAdvancedTouchOccurrenceForOutgoingThrow(
    game,
    point,
    possession,
    action.id,
  );
  const thrower = getThrowerField(game, point, possession, action, holderTouch);
  const receiver = field(game, point, possession.sideId, action.toPlayer, [action.id]);
  const defenderSideId = getOtherSideId(game, possession.sideId);
  const defender = field(game, point, defenderSideId, action.defender, [action.id]);
  const actionResult = currentResult(action);
  const availableResults = ADVANCED_TURNOVER_EDITOR_RESULTS.filter((result) =>
    hasConfigurableRole(
      getResultRole(result, receiver, defender) ?? receiver,
      result,
      result === 'drop' || result === 'fifty-fifty',
    ),
  );
  const eligibleThrowTypes = getEligibleThrowTypes(action.result);
  const canClassify = isFullRosterSide(game, action.sideId);

  return {
    kind: 'turnover',
    point,
    possession,
    action,
    holderTouch,
    thrower,
    receiver,
    defender,
    availableResults,
    currentResult: actionResult,
    currentThrowType: action.details?.type,
    eligibleThrowTypes,
    canClassify,
  };
}

/** Enumerates turnover actions with at least one meaningful valid edit. */
export function getCorrectableAdvancedTurnoverContexts(
  game: AdvancedTrackedGame,
): AdvancedTurnoverCorrectionContext[] {
  const contexts: AdvancedTurnoverCorrectionContext[] = [];
  for (const point of game.points) {
    for (const possession of point.possessions) {
      for (const action of possession.actions) {
        if (action.kind !== 'throw' || !isTurnoverThrow(action.result)) {
          continue;
        }
        try {
          const context = getAdvancedTurnoverCorrectionContext(game, {
            pointId: point.id,
            possessionId: possession.id,
            actionId: action.id,
          });
          const hasResultAlternative = context.availableResults.some(
            (result) => result !== context.currentResult,
          );
          const hasThrowerAlternative =
            context.thrower.currentRef?.refType !== 'untracked' &&
            context.thrower.eligibleParticipants.some(
              (participant) => participant.id !== context.thrower.currentParticipantId,
            );
          const currentRole = getResultRole(
            context.currentResult,
            context.receiver,
            context.defender,
          );
          const hasRoleAlternative =
            currentRole != null && hasAlternativeParticipant(currentRole, false);
          const hasClassificationAlternative =
            context.canClassify &&
            hasAlternativeThrowType(context.currentThrowType, context.eligibleThrowTypes);
          if (
            hasResultAlternative ||
            hasThrowerAlternative ||
            hasRoleAlternative ||
            hasClassificationAlternative
          ) {
            contexts.push(context);
          }
        } catch {
          // Imported or partially tracked records remain readable but are not editable.
        }
      }
    }
  }
  return contexts;
}

function replaceRef(ref: PlayerRef | undefined, participantId: string): PlayerRef {
  if (ref == null) throw new Error('The selected correction field is not present.');
  return { refType: 'participant', participantId };
}

function validateParticipant(
  role: AdvancedTurnoverParticipantField,
  participantId: string,
): PlayerRef {
  if (!role.eligibleParticipants.some((participant) => participant.id === participantId)) {
    throw new Error('The selected participant was not active for the corrected action.');
  }
  return replaceRef(role.currentRef ?? { refType: 'unknown' }, participantId);
}

function resolveRoleRef(
  role: AdvancedTurnoverParticipantField,
  participantId: string | null | undefined,
  required: boolean,
  allowUntracked: boolean,
): PlayerRef | undefined {
  if (participantId != null) return validateParticipant(role, participantId);
  if (role.currentRef?.refType === 'untracked' && allowUntracked) return role.currentRef;
  if (role.currentRef?.refType === 'participant') {
    return validateParticipant(role, role.currentRef.participantId);
  }
  if (!required) return undefined;
  if (!role.isFullRoster && allowUntracked) return { refType: 'untracked' };
  throw new Error('A tracked participant is required for this turnover result.');
}

function normalizeThrowAction(
  context: AdvancedTurnoverCorrectionContext,
  input: CorrectAdvancedTurnoverInput,
  thrower: PlayerRef,
  receiver: PlayerRef | undefined,
  defender: PlayerRef | undefined,
): ThrowAction {
  const {
    toPlayer: _toPlayer,
    defender: _defender,
    splitAttribution: _splitAttribution,
    details: _details,
    ...base
  } = context.action;
  const result = input.result === 'fifty-fifty' ? 'drop' : input.result;
  const eligibleTypes = getEligibleThrowTypes(result);
  let throwType = context.canClassify ? input.throwType : context.action.details?.type;
  if (result === 'stall') {
    throwType = undefined;
  }
  if (throwType != null && !eligibleTypes.includes(throwType)) {
    throw new Error(`Throw type "${throwType}" is not eligible for this result.`);
  }
  return {
    ...base,
    thrower,
    result,
    ...(input.result === 'drop' || input.result === 'fifty-fifty' ? { toPlayer: receiver } : {}),
    ...(input.result === 'fifty-fifty' ? { splitAttribution: true } : {}),
    ...(input.result === 'block' || input.result === 'pressure' || input.result === 'stall'
      ? { defender }
      : {}),
    ...(throwType != null ? { details: { type: throwType } } : {}),
  };
}

function mapCorrectedTurnoverAction(
  action: PossessionAction,
  context: AdvancedTurnoverCorrectionContext,
  input: CorrectAdvancedTurnoverInput,
  correctedAction: ThrowAction,
): PossessionAction {
  const participantId = input.throwerParticipantId;
  const holderTouch = context.holderTouch;
  const holderChanged =
    holderTouch != null &&
    participantId != null &&
    holderTouch.currentParticipantId !== participantId;

  if (!holderChanged || holderTouch == null || participantId == null) {
    return action.id === context.action.id && action.kind === 'throw' ? correctedAction : action;
  }

  const isIncomingHolderAction = action.id === holderTouch.incomingActionId;

  if (isIncomingHolderAction && action.kind === 'disc_pickup') {
    return {
      ...action,
      player: replaceRef(action.player, participantId),
    };
  }

  if (isIncomingHolderAction && action.kind === 'throw') {
    return {
      ...action,
      toPlayer: replaceRef(action.toPlayer, participantId),
    };
  }

  if (action.id === holderTouch.outgoingActionId && action.kind === 'throw') {
    return {
      ...correctedAction,
      thrower: replaceRef(action.thrower, participantId),
    };
  }

  if (action.id === context.action.id && action.kind === 'throw') {
    return correctedAction;
  }

  return action;
}

function mapPossessionActions(
  game: AdvancedTrackedGame,
  pointId: string,
  possessionId: string,
  mapAction: (action: PossessionAction) => PossessionAction,
): AdvancedTrackedGame {
  return {
    ...game,
    updatedAt: Date.now(),
    points: game.points.map((point) => {
      if (point.id !== pointId) return point;

      return {
        ...point,
        possessions: point.possessions.map((possession) => {
          if (possession.id !== possessionId) return possession;

          return {
            ...possession,
            actions: possession.actions.map(mapAction),
          };
        }),
      };
    }),
  };
}

/** Applies a turnover result, attribution, and classification correction atomically. */
export function correctAdvancedTurnover(
  game: AdvancedTrackedGame,
  input: CorrectAdvancedTurnoverInput,
): AdvancedTrackedGame {
  const context = getAdvancedTurnoverCorrectionContext(game, input);
  if (!context.availableResults.includes(input.result)) {
    throw new Error(`Turnover result "${input.result}" is not valid for this action.`);
  }
  const thrower =
    input.throwerParticipantId != null
      ? validateParticipant(context.thrower, input.throwerParticipantId)
      : context.action.thrower;
  const receiver =
    input.result === 'drop' || input.result === 'fifty-fifty'
      ? resolveRoleRef(context.receiver, input.receiverParticipantId, true, true)
      : undefined;
  const defender =
    input.result === 'block' || input.result === 'pressure' || input.result === 'stall'
      ? resolveRoleRef(
          context.defender,
          input.defenderParticipantId,
          true,
          input.result !== 'pressure',
        )
      : undefined;
  if (input.result === 'pressure' && defender?.refType !== 'participant') {
    throw new Error('Pressure requires a tracked defender.');
  }
  const correctedAction = normalizeThrowAction(context, input, thrower, receiver, defender);
  return mapPossessionActions(game, context.point.id, context.possession.id, (action) =>
    mapCorrectedTurnoverAction(action, context, input, correctedAction),
  );
}
