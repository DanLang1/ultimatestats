import type { PointSub, PossessionAction, TrackedPoint } from './types';

/** The participants one substitution moves off and onto a side's line. */
export interface LineupChange {
  inIds: string[];
  outIds: string[];
}

/** Removes `outIds`, then appends `inIds` that are not already on the line. */
export function applySub(lineIds: Iterable<string>, change: LineupChange): string[] {
  const line = new Set(lineIds);
  for (const participantId of change.outIds) line.delete(participantId);
  for (const participantId of change.inIds) line.add(participantId);
  return [...line];
}

/**
 * Undoes {@link applySub}: removes `inIds` and restores `outIds` at the first incoming player's
 * slot. Order is not a strict inverse: reversing `b` out / `x` in on `[a, c, x]` gives `[a, c, b]`.
 * Throws when no incoming player is on the line.
 */
export function reverseSub(lineIds: readonly string[], change: LineupChange): string[] {
  const incomingIds = new Set(change.inIds);
  const firstIncomingIndex = lineIds.findIndex((participantId) => incomingIds.has(participantId));
  if (firstIncomingIndex === -1) {
    throw new Error('Cannot reverse a substitution with no incoming players on the line.');
  }
  const previousIds = lineIds.filter((participantId) => !incomingIds.has(participantId));
  previousIds.splice(firstIncomingIndex, 0, ...change.outIds);
  return previousIds;
}

/** Each side's active participants, keyed in starting-line order with sub-only sides appended. */
export type ActiveLinesBySide = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Replays the point's actions in order and returns the lines active at the end of the point. When
 * given, `visit` receives each action with a snapshot of the lines active immediately before it;
 * subs tied to a stoppage apply after that stoppage is visited.
 */
export function replayActionLineups(
  point: TrackedPoint,
  visit?: (action: PossessionAction, linesBySide: ActiveLinesBySide) => void,
): ActiveLinesBySide {
  const linesBySide = new Map(
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
      // Each sub replaces its side's set, so a shallow copy is a stable snapshot.
      visit?.(action, new Map(linesBySide));
      if (action.kind !== 'stoppage') continue;
      for (const sub of subsByStoppage.get(action.id) ?? []) {
        linesBySide.set(sub.sideId, new Set(applySub(linesBySide.get(sub.sideId) ?? [], sub)));
      }
    }
  }
  return linesBySide;
}

/**
 * Returns a side's active line immediately before `beforeActionId`, or at the end of the point when
 * no action is given. Throws when `beforeActionId` is not in the point.
 */
export function getActiveLineIds(
  point: TrackedPoint,
  sideId: string,
  beforeActionId?: string,
): string[] {
  if (beforeActionId == null) {
    return [...(replayActionLineups(point).get(sideId) ?? [])];
  }

  let lineBeforeAction: ReadonlySet<string> | undefined;
  let foundAction = false;
  replayActionLineups(point, (action, linesBySide) => {
    if (action.id !== beforeActionId) return;
    foundAction = true;
    lineBeforeAction = linesBySide.get(sideId);
  });
  if (!foundAction) {
    throw new Error(`Action "${beforeActionId}" was not found while resolving its active lineup.`);
  }
  return [...(lineBeforeAction ?? [])];
}

/** Returns a side's starting line plus everyone it subbed in or out during the point. */
export function getParticipantIdsUsedBySide(point: TrackedPoint, sideId: string): string[] {
  const participantIds = new Set(
    point.lines.find((line) => line.sideId === sideId)?.participantIds ?? [],
  );
  for (const sub of point.subs ?? []) {
    if (sub.sideId !== sideId) continue;
    for (const participantId of [...sub.inIds, ...sub.outIds]) {
      participantIds.add(participantId);
    }
  }
  return [...participantIds];
}
