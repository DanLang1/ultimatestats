import { didGoalTriggerHalftime } from '@/lib/halftimeUtils';
import { MatchingType, PointLineRecord } from '@/lib/storage/types';
import { GameEvent, TurnoverType } from '@/store/gameStore.types';

// Represents a turnover for display purposes
export interface DisplayTurnover {
  team: 'team1' | 'team2';
  type: TurnoverType;
  playerId: string | null;
  player2Id?: string | null;
  eventIndex: number; // Index in raw events array for editing
  elapsedMs?: number; // Elapsed game time when this event occurred
}

// Represents a timeout for display purposes
export interface DisplayTimeout {
  team: 'team1' | 'team2';
  isFloater: boolean;
  eventIndex: number; // Index in raw events array
  elapsedMs?: number; // Elapsed game time when timeout was called
}

// Represents all events that occurred during a single point
export interface PointEvents {
  pointNumber: number; // The point number (1, 2, 3...)
  scoringTeam: 'team1' | 'team2';
  scoreAfter: { team1: number; team2: number };
  // Goal info (if team1 scored) - now stores player IDs
  goalPlayerId: string | null;
  assistPlayerId: string | null;
  goalEventIndex: number; // Index in raw events array for editing
  goalElapsedMs?: number; // Elapsed game time when the goal was scored
  // Turnovers that happened during this point
  turnovers: DisplayTurnover[];
  // Timeouts that happened during this point
  timeouts: DisplayTimeout[];
  // Possession data
  offensiveTeam: 'team1' | 'team2'; // Who started with the disk
  possessionType: 'hold' | 'break' | null; // scoringTeam === offensiveTeam ? hold : break, null if in progress
  // Point in progress (turnovers recorded but no goal yet)
  isInProgress?: boolean;
  // Timing info
  pointStartTimestamp?: number; // When point started (from Start Point button)
  pointDurationMs?: number; // Time from point start (or first event) to goal
}

export interface TimelineLineupEntry {
  playerId: string;
  isSubIn: boolean;
  isInjuredOut: boolean;
}

export interface PointCardTimelineData {
  isCallahan: boolean;
  callahanBlockEventIndex?: number;
  mergedEvents: TimelineEvent[];
  hasVisibleEvents: boolean;
  splitToGoalMs?: number;
}

interface PointTimingEntry {
  eventIndex: number;
  elapsedMs?: number;
}

export interface PointTimingBounds {
  minAllowedMs?: number;
  maxAllowedMs?: number;
}

function getPointTimingEntries(point: PointEvents): PointTimingEntry[] {
  const entries: PointTimingEntry[] = [
    ...point.turnovers.map((turnover) => ({
      eventIndex: turnover.eventIndex,
      elapsedMs: turnover.elapsedMs,
    })),
    ...point.timeouts.map((timeout) => ({
      eventIndex: timeout.eventIndex,
      elapsedMs: timeout.elapsedMs,
    })),
  ];

  if (point.goalEventIndex >= 0) {
    entries.push({ eventIndex: point.goalEventIndex, elapsedMs: point.goalElapsedMs });
  }

  entries.sort((a, b) => a.eventIndex - b.eventIndex);
  return entries;
}

export function getPointTimingBounds(
  point: PointEvents | undefined,
  eventIndex: number,
): PointTimingBounds {
  if (!point) return {};

  const entries = getPointTimingEntries(point);
  const targetIndex = entries.findIndex((entry) => entry.eventIndex === eventIndex);
  if (targetIndex === -1) return {};

  const previousTimed = [...entries.slice(0, targetIndex)]
    .reverse()
    .find((entry) => entry.elapsedMs !== undefined)?.elapsedMs;
  const nextTimed = entries
    .slice(targetIndex + 1)
    .find((entry) => entry.elapsedMs !== undefined)?.elapsedMs;

  return {
    minAllowedMs: previousTimed,
    maxAllowedMs: nextTimed,
  };
}

/**
 * Returns the latest timed non-goal event in a point.
 * Goal duration edits must stay at or after this value so the timeline remains chronological.
 */
export function getMinAllowedPointDurationMs(
  point: Pick<PointEvents, 'turnovers' | 'timeouts'>,
): number | undefined {
  return [...point.turnovers, ...point.timeouts]
    .map((event) => event.elapsedMs)
    .filter((ms): ms is number => ms !== undefined)
    .reduce<number | undefined>(
      (max, ms) => (max === undefined ? ms : Math.max(max, ms)),
      undefined,
    );
}

export function getPointDurationValidationError(
  point: Pick<PointEvents, 'turnovers' | 'timeouts'> | undefined,
  pointDurationMs: number,
): string | null {
  if (!point || pointDurationMs <= 0) return null;

  const minAllowedGoalMs = getMinAllowedPointDurationMs(point);
  if (minAllowedGoalMs === undefined || pointDurationMs >= minAllowedGoalMs) {
    return null;
  }

  return `Duration can't be earlier than the last event (${formatClockDuration(minAllowedGoalMs)}).`;
}

export function getEventTimeValidationError(
  point: PointEvents | undefined,
  eventIndex: number,
  elapsedMs: number,
): string | null {
  if (!point || elapsedMs <= 0) return null;

  const { minAllowedMs, maxAllowedMs } = getPointTimingBounds(point, eventIndex);
  if (minAllowedMs !== undefined && elapsedMs < minAllowedMs) {
    return `Time can't be earlier than the previous timed event (${formatClockDuration(minAllowedMs)}).`;
  }
  if (maxAllowedMs !== undefined && elapsedMs > maxAllowedMs) {
    return `Time can't be later than the next timed event (${formatClockDuration(maxAllowedMs)}).`;
  }

  return null;
}

/**
 * Computes point-by-point events from unified game events array.
 * Events are already in chronological order, so we just group turnovers between goals.
 */
export function computePointByPointEvents(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  _gameTo: number,
  pointStartTimestamps?: Record<number, number>,
  currentPointStartTime?: number | null, // For in-progress points
  autoHalftimeEnabled = true,
): PointEvents[] {
  const result: PointEvents[] = [];
  let currentTurnovers: DisplayTurnover[] = [];
  let currentTimeouts: DisplayTimeout[] = [];
  let pointNumber = 0;
  let team1Score = 0;
  let team2Score = 0;

  let hasReachedHalftime = false;

  // Track who is ON OFFENSE (receiving the pull) for the current point
  let currentOffensiveTeam: 'team1' | 'team2' = startingPossession || 'team1';

  for (let eventIdx = 0; eventIdx < events.length; eventIdx++) {
    const event = events[eventIdx];
    if (event.type === 'turnover') {
      // Collect turnovers for the current point
      currentTurnovers.push({
        team: event.team,
        type: event.subtype,
        playerId: event.playerId,
        player2Id: event.player2Id,
        eventIndex: eventIdx,
        elapsedMs: event.elapsedMs,
      });
    } else if (event.type === 'timeout') {
      // Collect timeouts for the current point
      currentTimeouts.push({
        team: event.team,
        isFloater: event.isFloater,
        eventIndex: eventIdx,
        elapsedMs: event.elapsedMs,
      });
    } else if (event.type === 'goal') {
      pointNumber++;

      // Determine possession type for THIS point
      const possessionType = event.team === currentOffensiveTeam ? 'hold' : 'break';
      const offensiveTeamForThisPoint = currentOffensiveTeam;

      // Update score
      if (event.team === 'team1') {
        team1Score++;
      } else {
        team2Score++;
      }

      // Point duration is simply the goal's elapsedMs (already is the duration)
      const pointDurationMs = event.elapsedMs;

      // Record the point
      result.push({
        pointNumber,
        scoringTeam: event.team,
        scoreAfter: { team1: team1Score, team2: team2Score },
        goalPlayerId: event.goalPlayerId,
        assistPlayerId: event.assistPlayerId,
        goalEventIndex: eventIdx,
        goalElapsedMs: event.elapsedMs,
        turnovers: currentTurnovers,
        timeouts: currentTimeouts,
        offensiveTeam: offensiveTeamForThisPoint,
        possessionType,
        pointDurationMs,
      });

      // Reset for next point
      currentTurnovers = [];
      currentTimeouts = [];

      // Update offensive team for NEXT point
      if (autoHalftimeEnabled && didGoalTriggerHalftime(event, hasReachedHalftime)) {
        // Halftime reached! The team that started on defense receives to start 2nd half.
        currentOffensiveTeam = startingPossession === 'team1' ? 'team2' : 'team1';
        hasReachedHalftime = true;
      } else {
        // Normal point: Scoring team pulls -> other team becomes offense
        currentOffensiveTeam = event.team === 'team1' ? 'team2' : 'team1';
      }
    }
  }

  // If there are pending turnovers or timeouts after the loop, show them as an in-progress point
  if (currentTurnovers.length > 0 || currentTimeouts.length > 0) {
    const inProgressPointNumber = pointNumber + 1;
    // Use working timestamp OR historical (from before undo)
    const effectiveStartTime =
      currentPointStartTime ?? pointStartTimestamps?.[inProgressPointNumber];
    result.push({
      pointNumber: inProgressPointNumber,
      scoringTeam: 'team1', // placeholder - point not scored yet
      scoreAfter: { team1: team1Score, team2: team2Score },
      goalPlayerId: null,
      assistPlayerId: null,
      goalEventIndex: -1, // No goal yet
      turnovers: currentTurnovers,
      timeouts: currentTimeouts,
      offensiveTeam: currentOffensiveTeam,
      possessionType: null, // Unknown until point completes
      isInProgress: true,
      pointStartTimestamp: effectiveStartTime,
    });
  }

  return result;
}

// Union type for timeline events (turnovers and timeouts)
export type TimelineEvent =
  | { kind: 'turnover'; data: DisplayTurnover; originalIndex: number }
  | { kind: 'timeout'; data: DisplayTimeout; originalIndex: number };

/**
 * Merge turnovers and timeouts into a single list sorted by elapsedMs.
 * Events without elapsedMs are placed after timed events.
 * Ties fall back to raw event order so untimed events still render chronologically.
 */
export function mergeTimelineEvents(
  turnovers: DisplayTurnover[],
  timeouts: DisplayTimeout[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...turnovers.map((t, i) => ({ kind: 'turnover' as const, data: t, originalIndex: i })),
    ...timeouts.map((t, i) => ({ kind: 'timeout' as const, data: t, originalIndex: i })),
  ];
  events.sort((a, b) => {
    const aMs = a.data.elapsedMs ?? Infinity;
    const bMs = b.data.elapsedMs ?? Infinity;
    if (aMs === bMs) {
      return a.data.eventIndex - b.data.eventIndex;
    }
    return aMs - bMs;
  });
  return events;
}

/**
 * Format milliseconds as "m:ss" (or "h:mm:ss" for long durations).
 */
export function formatClockDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format a split duration as "+Xs", "+m:ss", or "+h:mm:ss".
 */
export function formatSplitDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `+${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (minutes > 0) {
    return `+${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return `+${seconds}s`;
}

/**
 * Compute the split between two timestamps rounded to the nearest second.
 * Rounding both operands first ensures the result matches the displayed timestamps
 * and avoids off-by-one display issues (e.g. 3:32 → 3:44 should show +12s, not +11s).
 */
export function computeRoundedSplitMs(fromMs: number, toMs: number): number {
  return (Math.round(toMs / 1000) - Math.round(fromMs / 1000)) * 1000;
}

export function getMatchingTypeColor(
  matchingType: MatchingType | null | undefined,
  colors: {
    mmpColor: string;
    fmpColor: string;
    fallbackColor: string;
  },
): string {
  if (matchingType === 'mmp') {
    return colors.mmpColor;
  }

  if (matchingType === 'fmp') {
    return colors.fmpColor;
  }

  return colors.fallbackColor;
}

/**
 * Remove the callahan block event from a merged event list.
 * The block is hidden because it's implicit in the CALLAHAN goal chip.
 * If callahanBlockEventIndex is undefined (block not found), returns events unchanged.
 */
export function filterCallahanBlock(
  events: TimelineEvent[],
  callahanBlockEventIndex: number | undefined,
): TimelineEvent[] {
  if (callahanBlockEventIndex === undefined) return events;
  return events.filter(
    (event) => !(event.kind === 'turnover' && event.data.eventIndex === callahanBlockEventIndex),
  );
}

export function buildPointCardTimelineData(
  point: Pick<
    PointEvents,
    'assistPlayerId' | 'goalElapsedMs' | 'goalPlayerId' | 'timeouts' | 'turnovers'
  >,
  options: {
    isTeam1: boolean;
    timingEnabled: boolean;
    showSplitSeparators: boolean;
  },
): PointCardTimelineData {
  const isCallahan = options.isTeam1 && point.assistPlayerId === 'OTHER_TEAM';

  let callahanBlockEventIndex: number | undefined;
  if (isCallahan && point.goalPlayerId !== null) {
    const callahanBlock = [...point.turnovers]
      .reverse()
      .find((turnover) => turnover.type === 'block' && turnover.playerId === point.goalPlayerId);
    callahanBlockEventIndex = callahanBlock?.eventIndex;
  }

  const mergedEvents = filterCallahanBlock(
    mergeTimelineEvents(point.turnovers, point.timeouts),
    callahanBlockEventIndex,
  );
  const hasVisibleEvents = mergedEvents.length > 0;

  let splitToGoalMs: number | undefined;
  if (options.timingEnabled && options.showSplitSeparators && point.goalElapsedMs !== undefined) {
    const lastVisibleTimedEvent = [...mergedEvents]
      .reverse()
      .find((event) => event.data.elapsedMs !== undefined);

    if (
      lastVisibleTimedEvent?.data.elapsedMs !== undefined &&
      point.goalElapsedMs >= lastVisibleTimedEvent.data.elapsedMs
    ) {
      splitToGoalMs = computeRoundedSplitMs(
        lastVisibleTimedEvent.data.elapsedMs,
        point.goalElapsedMs,
      );
    }
  }

  return {
    isCallahan,
    callahanBlockEventIndex,
    mergedEvents,
    hasVisibleEvents,
    splitToGoalMs,
  };
}

/**
 * Build lineup footer entries for a point timeline card.
 * When explicit injury-sub metadata exists, prefer the final line and append injured-out players
 * so both credited groups remain visible. Legacy records fall back to all players who appeared.
 */
export function buildTimelineLineupEntries(
  allPlayersForPoint: Iterable<string>,
  pointRecords: PointLineRecord[],
): TimelineLineupEntry[] {
  const allPlayers = [...allPlayersForPoint];
  const injuryRecords = pointRecords.filter((record) => record.substitutionType === 'injury');
  const hasExplicitInjuryMetadata = injuryRecords.some(
    (record) =>
      (record.subbedInPlayerIds?.length ?? 0) > 0 || (record.subbedOutPlayerIds?.length ?? 0) > 0,
  );

  if (!hasExplicitInjuryMetadata) {
    return allPlayers.map((playerId) => ({
      playerId,
      isSubIn: false,
      isInjuredOut: false,
    }));
  }

  const finalLine = pointRecords[pointRecords.length - 1]?.playerIds ?? [];
  const finalLineSet = new Set(finalLine);
  const subbedInPlayers = new Set(
    injuryRecords.flatMap((record) => record.subbedInPlayerIds ?? []),
  );
  const injuredOutPlayers = new Set(
    injuryRecords.flatMap((record) => record.subbedOutPlayerIds ?? []),
  );
  const displayedPlayers =
    finalLine.length > 0
      ? [
          ...finalLine,
          ...allPlayers.filter(
            (playerId) => !finalLineSet.has(playerId) && injuredOutPlayers.has(playerId),
          ),
        ]
      : allPlayers;
  const uniqueDisplayedPlayers = [...new Set(displayedPlayers)];

  return uniqueDisplayedPlayers.map((playerId) => ({
    playerId,
    isSubIn: subbedInPlayers.has(playerId),
    isInjuredOut: injuredOutPlayers.has(playerId),
  }));
}

/**
 * Get total turnovers by type
 */
export function getTurnoverSummary(turnovers: DisplayTurnover[], teamFilter?: 'team1' | 'team2') {
  return {
    blocks: turnovers.filter(
      (t) => t.type === 'block' && (teamFilter ? t.team === teamFilter : true),
    ).length,
    throwaways: turnovers.filter((t) => t.type === 'throwaway' || t.type === 'fiftyfifty').length,
    drops: turnovers.filter((t) => t.type === 'drop').length,
  };
}
