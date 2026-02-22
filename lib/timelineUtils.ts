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

/**
 * Computes point-by-point events from unified game events array.
 * Events are already in chronological order, so we just group turnovers between goals.
 */
export function computePointByPointEvents(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
  pointStartTimestamps?: Record<number, number>,
  currentPointStartTime?: number | null, // For in-progress points
): PointEvents[] {
  const result: PointEvents[] = [];
  let currentTurnovers: DisplayTurnover[] = [];
  let currentTimeouts: DisplayTimeout[] = [];
  let pointNumber = 0;
  let team1Score = 0;
  let team2Score = 0;

  // Calculate halftime score
  const halftimeScore = Math.ceil(gameTo / 2);
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
      if (!hasReachedHalftime && (team1Score === halftimeScore || team2Score === halftimeScore)) {
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
    if (aMs === bMs) return 0;
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
