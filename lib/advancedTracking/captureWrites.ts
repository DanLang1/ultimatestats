/**
 * Live writes for on-field play: possessions and their actions. See `WriteContext` for what the
 * store checks before calling these.
 */
import type { GenderRatio } from '@/lib/genderRatioUtils';

import type { PlannedCapture } from './captureIntentUtils';
import type { CapTimingSettings } from './capUtils';
import { getActiveSideId } from './livePlayState';
import type { ActionUndoEntry, PullAmendmentUndoEntry } from './persistenceTypes';
import { getGameClockElapsedMs } from './trackingDisplayHelpers';
import {
  assertValidParticipantRefs,
  assertValidSideIds,
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  getReceivingSideForNextPoint,
  isPointEndingThrow,
  isPossessionOver,
  syncCapTransitions,
  syncDerivedHalftimeTransition,
} from './trackingUtils';
import {
  getEligibleThrowTypes,
  hasRequiredThrowDefender,
  type AdvancedTrackedGame,
  type FieldLocation,
  type PlayerRef,
  type PointLine,
  type PointPossession,
  type PullResult,
  type ThrowType,
} from './types';
import type { WriteContext } from './writeContext';

export interface RecordPullInput {
  lines: PointLine[];
  puller: PlayerRef;
  receiver?: PlayerRef;
  result: PullResult;
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
  genderRatio?: GenderRatio;
}

/**
 * Starts the next point with its opening pull, received by the side due to receive. The caller
 * validates the input and that no point is in progress. Returns the pull's undo entry, which carries
 * the new action ID.
 */
export function applyPull(
  game: AdvancedTrackedGame,
  input: RecordPullInput,
  ctx: WriteContext,
): ActionUndoEntry {
  const receivingSideId = getReceivingSideForNextPoint(game);
  const pullingSideId = getOtherSideId(game, receivingSideId);
  const pointId = ctx.newId();
  const possessionId = ctx.newId();
  const actionId = ctx.newId();
  game.points.push({
    id: pointId,
    lines: input.lines,
    genderRatio: input.genderRatio,
    startedAt: ctx.at,
    possessions: [
      {
        id: possessionId,
        sideId: receivingSideId,
        actions: [
          {
            id: actionId,
            kind: 'pull',
            sideId: pullingSideId,
            receivingSideId,
            puller: input.puller,
            receiver: input.receiver,
            result: input.result,
            hangTimeMs: input.hangTimeMs,
            origin: input.origin,
            landing: input.landing,
            recordedAt: ctx.at,
          },
        ],
      },
    ],
  });
  return { kind: 'action', pointId, possessionId, actionId };
}

/**
 * Amends the current point's opening pull to a drop by `receiver`. The caller asserts
 * `canAmendOpeningPull`. Returns the undo entry holding the pull's previous result and receiver.
 */
export function applyPullDropAmendment(
  game: AdvancedTrackedGame,
  receiver: PlayerRef,
): PullAmendmentUndoEntry {
  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const openingAction = possession?.actions[0];
  if (point == null || possession == null || openingAction?.kind !== 'pull') {
    throw new Error('The current possession does not open with a pull.');
  }

  const undoEntry: PullAmendmentUndoEntry = {
    kind: 'amend_pull_result',
    pointId: point.id,
    possessionId: possession.id,
    actionId: openingAction.id,
    previousResult: openingAction.result,
    previousReceiver: openingAction.receiver,
  };
  openingAction.result = 'dropped';
  openingAction.receiver = receiver;
  return undoEntry;
}

function isRedZoneOnlyAnonymousScaffold(possession: PointPossession): boolean {
  return possession.redZone?.anonymousScaffold === true && possession.actions.length === 1;
}

/**
 * Enters or leaves Red Zone on the active possession. Entering with no active possession creates an
 * anonymous scaffold possession (an untracked pickup) to carry it; leaving a scaffold that holds only
 * that pickup removes the scaffold. The caller skips writes that would not change Red Zone.
 */
export function applyRedZone(
  game: AdvancedTrackedGame,
  isRedZone: boolean,
  ctx: WriteContext,
): void {
  const point = getCurrentPoint(game);
  if (point == null) throw new Error('No current point for Red Zone.');
  const currentPossession = getCurrentPossession(game);
  const activeSideId = getActiveSideId(currentPossession, game);
  const activePossession = isPossessionOver(currentPossession) ? null : currentPossession;

  if (activePossession == null) {
    point.possessions.push({
      id: ctx.newId(),
      sideId: activeSideId,
      redZone: { enteredAt: ctx.at, anonymousScaffold: true },
      actions: [
        {
          id: ctx.newId(),
          kind: 'disc_pickup',
          sideId: activeSideId,
          player: { refType: 'untracked' },
          recordedAt: ctx.at,
        },
      ],
    });
  } else if (isRedZone) {
    activePossession.redZone = { enteredAt: ctx.at };
  } else if (isRedZoneOnlyAnonymousScaffold(activePossession)) {
    const scaffoldIndex = point.possessions.findIndex(
      (possession) => possession.id === activePossession.id,
    );
    point.possessions.splice(scaffoldIndex, 1);
  } else {
    delete activePossession.redZone;
  }
}

/** What a capture wrote, for the store to apply. */
export interface CaptureWriteResult {
  /** Undo entries for the pickup and/or throw, in the order they were written. */
  undoEntries: ActionUndoEntry[];
  /** The last action written: the throw when there is one, otherwise the pickup. */
  visibleActionId: string;
  /** True when a throw put the game in the halftime break. */
  isHalftimeBreakActive: boolean;
}

function assertValidCapturePlan(game: AdvancedTrackedGame, plan: PlannedCapture): void {
  if (plan.pickup != null) {
    assertValidSideIds(game, [plan.pickup.sideId]);
    assertValidParticipantRefs(game, [plan.pickup.player]);
  }
  const throwInput = plan.throw;
  if (throwInput != null) {
    assertValidParticipantRefs(game, [
      throwInput.thrower,
      throwInput.toPlayer,
      throwInput.defender,
    ]);
    if (!hasRequiredThrowDefender(throwInput)) {
      throw new Error(`Throw result "${throwInput.result}" requires a tracked defender.`);
    }
  }
}

/**
 * Appends a planned capture (from `planCaptureIntent`) to the current point: a pickup, starting a
 * new possession when the current one is over, then a throw. After a throw it records any crossed
 * cap and rederives halftime. Throws before mutating when the plan references unknown sides or
 * participants or lacks a required defender.
 */
export function applyCapture(
  game: AdvancedTrackedGame,
  plan: PlannedCapture,
  ctx: WriteContext,
  capTiming: CapTimingSettings,
): CaptureWriteResult {
  assertValidCapturePlan(game, plan);
  const point = getCurrentPoint(game);
  let possession = getCurrentPossession(game);
  if (point == null || possession == null) throw new Error('No current possession to capture.');

  const undoEntries: ActionUndoEntry[] = [];
  let visibleActionId: string | undefined;
  if (plan.pickup != null) {
    if (isPossessionOver(possession)) {
      possession = { id: ctx.newId(), sideId: plan.pickup.sideId, actions: [] };
      point.possessions.push(possession);
    }
    const pickupId = ctx.newId();
    possession.actions.push({
      id: pickupId,
      kind: 'disc_pickup',
      sideId: plan.pickup.sideId,
      player: plan.pickup.player,
      recordedAt: ctx.at,
    });
    undoEntries.push({
      kind: 'action',
      pointId: point.id,
      possessionId: possession.id,
      actionId: pickupId,
    });
    visibleActionId = pickupId;
  }

  const throwInput = plan.throw;
  if (throwInput == null) {
    if (visibleActionId == null) throw new Error('A capture plan must write a pickup or a throw.');
    return { undoEntries, visibleActionId, isHalftimeBreakActive: false };
  }

  const throwId = ctx.newId();
  possession.actions.push({
    id: throwId,
    kind: 'throw',
    sideId: possession.sideId,
    thrower: throwInput.thrower,
    result: throwInput.result,
    toPlayer: throwInput.toPlayer,
    defender: throwInput.defender,
    splitAttribution: throwInput.splitAttribution,
    recordedAt: ctx.at,
  });
  undoEntries.push({
    kind: 'action',
    pointId: point.id,
    possessionId: possession.id,
    actionId: throwId,
  });
  if (isPointEndingThrow(throwInput.result) && game.points[0]?.startedAt != null) {
    syncCapTransitions(game, {
      gameElapsedMs: getGameClockElapsedMs(game, ctx.at),
      capTiming,
    });
  }
  const isHalftimeBreakActive = syncDerivedHalftimeTransition(game);
  return { undoEntries, visibleActionId: throwId, isHalftimeBreakActive };
}

export interface UpdateThrowTypeInput {
  pointId: string;
  possessionId: string;
  actionId: string;
  type?: ThrowType;
}

/**
 * Sets or clears a throw's type detail on a live game draft. Throws for a missing throw, a side
 * that is not fully tracked, or a type the throw's result does not allow.
 */
export function applyThrowType(game: AdvancedTrackedGame, input: UpdateThrowTypeInput): void {
  const point = game.points.find((candidate) => candidate.id === input.pointId);
  const possession = point?.possessions.find((candidate) => candidate.id === input.possessionId);
  const action = possession?.actions.find((candidate) => candidate.id === input.actionId);
  if (action?.kind !== 'throw') {
    throw new Error(`Cannot update missing throw action "${input.actionId}".`);
  }
  const actionSide = game.sides.find((side) => side.id === action.sideId);
  if (actionSide?.trackingMode !== 'full-roster') {
    throw new Error('Throw details can only be added for fully tracked sides.');
  }

  if (input.type == null) {
    delete action.details;
  } else if (!getEligibleThrowTypes(action.result).includes(input.type)) {
    if (input.type === 'backfield_reset') {
      throw new Error('Backfield reset details require a turnover result.');
    }
    throw new Error(`Throw type "${input.type}" is not eligible for this result.`);
  } else {
    action.details = { ...action.details, type: input.type };
  }
}
