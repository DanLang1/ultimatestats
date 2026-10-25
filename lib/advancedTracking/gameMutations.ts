import { withAdvancedGameNote } from './gameNoteUtils';
import { getSafeDiscHolderRef } from './trackingDisplayHelpers';
import { assertTwoSides } from './trackingUtils';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedGameType,
  type AdvancedTrackedGame,
  type GameFlip,
  type GameMetadata,
  type GameSide,
  type Participant,
  type TrackedPoint,
} from './types';

export interface CreateAdvancedGameInput {
  id?: string;
  gameType?: AdvancedGameType;
  focusSideId: string;
  initialReceivingSideId: string;
  flip?: GameFlip;
  sides: GameSide[];
  participants: Participant[];
  format: {
    gameTo: number;
    halftimeEnabled?: boolean;
    softCapEnabled?: boolean;
    hardCapEnabled?: boolean;
    timeoutsPerHalf?: number;
    floaterEnabled?: boolean;
  };
  metadata?: GameMetadata;
}

/**
 * Builds a new in-progress game with no points. `id` is the resolved game ID (the caller prefers
 * `input.id`) and `now` its creation time. Throws when the focus or receiving side is not one of
 * the game's two sides.
 */
export function createAdvancedGame(
  input: CreateAdvancedGameInput,
  { id, now }: { id: string; now: number },
): AdvancedTrackedGame {
  assertTwoSides(input.sides);

  const sideIds = new Set(input.sides.map((side) => side.id));
  if (!sideIds.has(input.focusSideId)) {
    throw new Error('focusSideId must match one of the advanced tracking sides.');
  }
  if (!sideIds.has(input.initialReceivingSideId)) {
    throw new Error('initialReceivingSideId must match one of the advanced tracking sides.');
  }

  return {
    id,
    schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    gameType: input.gameType ?? 'game',
    status: 'in_progress',
    focusSideId: input.focusSideId,
    initialReceivingSideId: input.initialReceivingSideId,
    ...(input.flip != null ? { flip: input.flip } : {}),
    metadata: withAdvancedGameNote(input.metadata, input.metadata?.notes),
    settings: {
      locationMode: 'none',
      format: {
        formatType: 'standard',
        gameTo: input.format.gameTo,
        halftimeAt:
          (input.format.halftimeEnabled ?? true) ? Math.ceil(input.format.gameTo / 2) : undefined,
        softCapEnabled: input.format.softCapEnabled,
        hardCapEnabled: input.format.hardCapEnabled,
        timeoutsPerHalf: input.format.timeoutsPerHalf,
        floaterEnabled: input.format.floaterEnabled,
      },
    },
    sides: input.sides,
    participants: input.participants,
    points: [],
  };
}

/** Drops subs recorded at the given stoppages; collapses an emptied list to `undefined`. */
export function removeSubsForStoppages(
  point: TrackedPoint,
  stoppageIds: ReadonlySet<string>,
): void {
  if (point.subs == null || stoppageIds.size === 0) return;
  const remainingSubs = point.subs.filter((sub) => !stoppageIds.has(sub.stoppageActionId));
  point.subs = remainingSubs.length > 0 ? remainingSubs : undefined;
}

/**
 * Removes one action from a live game draft. An emptied possession is removed, and the point too
 * when it was the point's only possession. Replaces `game.points` or `point.possessions` in those
 * cases, so callers must not reuse references to them afterwards.
 */
export function removeActionById(
  game: AdvancedTrackedGame,
  pointId: string,
  possessionId: string,
  actionId: string,
): void {
  const point = game.points.find((candidate) => candidate.id === pointId);
  const possession = point?.possessions.find((candidate) => candidate.id === possessionId);
  const actionIndex = possession?.actions.findIndex((candidate) => candidate.id === actionId) ?? -1;
  if (point == null || possession == null || actionIndex === -1) {
    throw new Error(
      `Action not found: point "${pointId}", possession "${possessionId}", action "${actionId}".`,
    );
  }

  const [removedAction] = possession.actions.splice(actionIndex, 1);

  if (removedAction.kind === 'stoppage') {
    removeSubsForStoppages(point, new Set([removedAction.id]));
  }

  if (possession.actions.length === 0) {
    if (point.possessions.length > 1) {
      point.possessions = point.possessions.filter((candidate) => candidate.id !== possessionId);
    } else {
      game.points = game.points.filter((candidate) => candidate.id !== pointId);
    }
    return;
  }

  const possessionSide = game.sides.find((side) => side.id === possession.sideId);
  if (
    possession.redZone != null &&
    possessionSide?.trackingMode === 'full-roster' &&
    getSafeDiscHolderRef(possession, possession.sideId, point) == null
  ) {
    delete possession.redZone;
  }
}
