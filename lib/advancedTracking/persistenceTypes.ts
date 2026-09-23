import type { AdvancedTrackedGame, PlayerRef, PullResult } from '@/lib/advancedTracking/types';

export const ADVANCED_UNDO_PAYLOAD_VERSION = 1;

export type AdvancedTrackingUndoEntry =
  | {
      kind: 'action';
      pointId: string;
      possessionId: string;
      actionId: string;
    }
  | {
      kind: 'between_point_timeout';
      pointId: string;
      transitionId: string;
    }
  | {
      kind: 'halftime_early';
      pointId: string;
      transitionId: string;
    }
  | {
      kind: 'amend_pull_result';
      pointId: string;
      possessionId: string;
      actionId: string;
      previousResult: PullResult;
      previousReceiver?: PlayerRef;
    };

export interface PersistedAdvancedUndoPayload {
  version: typeof ADVANCED_UNDO_PAYLOAD_VERSION;
  entries: AdvancedTrackingUndoEntry[];
}

export interface AdvancedGameHistorySnapshot {
  game: AdvancedTrackedGame;
  undoStack: AdvancedTrackingUndoEntry[];
}

export function createPersistedAdvancedUndoPayload(
  undoStack: AdvancedTrackingUndoEntry[],
): PersistedAdvancedUndoPayload {
  return {
    version: ADVANCED_UNDO_PAYLOAD_VERSION,
    entries: [...undoStack],
  };
}

function hasStringField(value: object, field: string): boolean {
  return typeof Reflect.get(value, field) === 'string';
}

function isPlayerRef(value: unknown): value is PlayerRef {
  if (typeof value !== 'object' || value == null) return false;
  const refType = Reflect.get(value, 'refType');
  return (
    refType === 'unknown' ||
    refType === 'untracked' ||
    (refType === 'participant' && hasStringField(value, 'participantId'))
  );
}

function isPullResult(value: unknown): value is PullResult {
  return value === 'inbound' || value === 'ob' || value === 'dropped' || value === 'roller';
}

function isAdvancedTrackingUndoEntry(value: unknown): value is AdvancedTrackingUndoEntry {
  if (typeof value !== 'object' || value == null) return false;
  const kind = Reflect.get(value, 'kind');
  if (!hasStringField(value, 'pointId')) return false;

  if (kind === 'between_point_timeout' || kind === 'halftime_early') {
    return hasStringField(value, 'transitionId');
  }

  if (kind === 'action') {
    return hasStringField(value, 'possessionId') && hasStringField(value, 'actionId');
  }

  if (kind === 'amend_pull_result') {
    const previousReceiver = Reflect.get(value, 'previousReceiver');
    return (
      hasStringField(value, 'possessionId') &&
      hasStringField(value, 'actionId') &&
      isPullResult(Reflect.get(value, 'previousResult')) &&
      (previousReceiver === undefined || isPlayerRef(previousReceiver))
    );
  }

  return false;
}

export function parsePersistedAdvancedUndoPayload(
  undoJson: string | null,
): AdvancedTrackingUndoEntry[] {
  if (undoJson == null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(undoJson);
  } catch {
    return [];
  }

  if (
    typeof parsed !== 'object' ||
    parsed == null ||
    Reflect.get(parsed, 'version') !== ADVANCED_UNDO_PAYLOAD_VERSION
  ) {
    return [];
  }

  const entries = Reflect.get(parsed, 'entries');
  return Array.isArray(entries) && entries.every(isAdvancedTrackingUndoEntry) ? entries : [];
}
