import { hasReachedHalftime } from '@/lib/basic/halftimeUtils';
import { deriveTimeoutState } from '@/lib/basic/timeoutUtils';
import { DEFAULT_HALFTIME_BREAK_SECONDS, DEFAULT_TIMEOUT_SECONDS } from '@/lib/constants';
import { getLatestLineForPoint } from '@/lib/lineUtils';
import { OTHER_TEAM_ID } from '@/lib/playerUtils';
import { Player, PointLineRecord } from '@/lib/storage';
import type { BasicGameFormatSettings } from '@/store/settingsStore';

import { EventUpdates, GameEvent, GameState, GoalEvent } from '../gameStore.types';

export function canReplacePointLine(
  pointLines: PointLineRecord[],
  pointNumber: number,
  playerIds: string[],
  roster: Player[],
): boolean {
  const existingLine = getLatestLineForPoint(pointLines, pointNumber);
  if (existingLine.length === 0 || playerIds.length !== existingLine.length) return false;
  if (new Set(playerIds).size !== playerIds.length) return false;

  const rosterPlayerIds = new Set(roster.map((player) => player.id));
  return playerIds.every((playerId) => rosterPlayerIds.has(playerId));
}

/** Copies the pre-game settings into the live game. */
export function applyGameFormatState(state: GameState, format: BasicGameFormatSettings) {
  state.team2Name = format.otherSideTeamName;
  state.gameTo = format.gameTo;
  state.baseGameTo = format.gameTo;
  state.team1Timeouts = Array.from({ length: format.timeoutsPerHalf }, () => true);
  state.team2Timeouts = Array.from({ length: format.timeoutsPerHalf }, () => true);
  state.autoHalftimeEnabled = format.autoHalftimeEnabled;
  state.floaterEnabled = format.floaterEnabled;
  state.timerEndTime = null;
  state.timerTimeLeft = format.hardCapMins * 60;
}

export function resetGameState(state: GameState, format: BasicGameFormatSettings) {
  applyGameFormatState(state, format);
  state.team1Score = 0;
  state.team2Score = 0;
  state.team1Floater = true;
  state.team2Floater = true;
  state.gameHalf = 1;
  state.isSoftCap = false;
  state.softCapPending = false;
  state.events = [];
  state.pendingStatEntry = null;
  state.possession = null;
  state.startingPossession = null;
  state.pendingTurnoverEntry = null;
  state.eventToastSignal = null;
  state.currentPoint = 1;
  state.currentGameStatus = 'fresh';
  state.isPostGameFlowPending = false;
  state.currentGameId = null;
  state.isHalftimeBreak = false;
  state.halftimeEndTime = null;
  state.halftimeTimeLeft = DEFAULT_HALFTIME_BREAK_SECONDS;
  state.pendingTimeoutModal = false;
  state.timeoutEndTime = null;
  state.timeoutTimeLeft = DEFAULT_TIMEOUT_SECONDS;
  state.currentPointStartTime = null;
  state.pointStartTimestamps = {};
  state.pointTimerPausedElapsed = null;
  state.currentLine = [];
  state.pointLines = [];
  state.lineConfirmedForNextPoint = false;
}

/** Elapsed ms of the current point, or undefined when the point timer has not started. */
export function getPointElapsedMs(state: GameState): number | undefined {
  if (state.currentPointStartTime === null) return undefined;
  return state.pointTimerPausedElapsed ?? Date.now() - state.currentPointStartTime;
}

/** Reverts the last event, `goal`, and puts its point back in progress. */
export function revertLastGoal(state: GameState, goal: GoalEvent) {
  if (goal.team === 'team1') state.team1Score--;
  else state.team2Score--;

  if (goal.triggeredSoftcap) {
    state.isSoftCap = false;
    state.softCapPending = true;
    state.gameTo = state.baseGameTo;
  }

  state.possession = goal.team;
  state.pendingStatEntry = null;
  state.currentPoint = Math.max(1, state.currentPoint - 1);
  // Resume the point timer from where the goal stopped it
  if (goal.elapsedMs !== undefined) {
    state.currentPointStartTime = Date.now() - goal.elapsedMs;
  } else {
    state.currentPointStartTime = null;
  }
  state.pointTimerPausedElapsed = null;
  // The point is in progress again, so it has no finalized start timestamp
  delete state.pointStartTimestamps[state.currentPoint];
  // Remove line records for future points (a line may have been set for the next point);
  // currentPoint is now the in-progress point, so its records stay
  state.pointLines = state.pointLines.filter((record) => record.pointNumber <= state.currentPoint);
  state.currentLine = getLatestLineForPoint(state.pointLines, state.currentPoint);
  state.lineConfirmedForNextPoint = false;
  state.events.pop();
}

/** Re-derives the half and the timeout state from the events, e.g. after undoing across halftime. */
export function rederiveHalftimeAndTimeouts(state: GameState) {
  const halftimeReached = hasReachedHalftime(state.events, state.autoHalftimeEnabled);
  state.gameHalf = halftimeReached ? 2 : 1;
  if (!halftimeReached) {
    state.isHalftimeBreak = false;
  }

  const derived = deriveTimeoutState(
    state.events,
    state.baseGameTo,
    state.autoHalftimeEnabled,
    state.team1Timeouts.length,
  );
  state.team1Timeouts = derived.team1Timeouts;
  state.team2Timeouts = derived.team2Timeouts;
  state.team1Floater = derived.team1Floater;
  state.team2Floater = derived.team2Floater;
}

/** Applies `updates` to the event at `eventIndex` in an Immer draft of a game's events. */
export function applyEventUpdates(events: GameEvent[], eventIndex: number, updates: EventUpdates) {
  const event = events[eventIndex];
  if (!event) return;

  if (updates.elapsedMs !== undefined) {
    if (updates.elapsedMs === null) {
      delete event.elapsedMs;
    } else {
      event.elapsedMs = updates.elapsedMs;
    }
  }

  if (event.type === 'turnover') {
    if (updates.playerId !== undefined) event.playerId = updates.playerId;
    if (updates.player2Id !== undefined) event.player2Id = updates.player2Id;
    if (updates.subtype !== undefined) event.subtype = updates.subtype;
    if (updates.team !== undefined) event.team = updates.team;
  } else if (event.type === 'goal') {
    const isCallahan = event.assistPlayerId === OTHER_TEAM_ID;

    if (updates.goalPlayerId !== undefined) event.goalPlayerId = updates.goalPlayerId;
    if (updates.assistPlayerId !== undefined) event.assistPlayerId = updates.assistPlayerId;

    // For Callahans: also update our block immediately before (edits can leave another event there)
    if (isCallahan && updates.goalPlayerId !== undefined && eventIndex > 0) {
      const prevEvent = events[eventIndex - 1];
      if (
        prevEvent.type === 'turnover' &&
        prevEvent.subtype === 'block' &&
        prevEvent.team === 'team1'
      ) {
        prevEvent.playerId = updates.goalPlayerId;
      }
    }
  }
}
