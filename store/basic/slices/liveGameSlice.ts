import { current } from 'immer';

import { getGameClockSecondsLeft } from '@/lib/basic/gameClockUtils';
import { checkGameOver } from '@/lib/basic/gameUtils';
import { canTriggerHalftimeEarly, hasReachedHalftime } from '@/lib/basic/halftimeUtils';
import { upsertBasicGames } from '@/lib/basic/savedGameStorage';
import { deriveTimeoutState } from '@/lib/basic/timeoutUtils';
import { DEFAULT_HALFTIME_BREAK_SECONDS, DEFAULT_TIMEOUT_SECONDS } from '@/lib/constants';
import { getLatestLineForPoint, replacePointLineRecords } from '@/lib/lineUtils';
import { UNKNOWN_PLAYER_ID } from '@/lib/playerUtils';
import { SavedGame } from '@/lib/storage';
import { palette } from '@/theme/theme';

import { useSettingsStore } from '../../settingsStore';
import { getCurrentTeam } from '../../teamStore';
import {
  EventToastSignal,
  GameSliceCreator,
  GameState,
  LiveGameSlice,
  TurnoverEvent,
  TurnoverType,
} from '../gameStore.types';
import { canReplacePointLine, putSavedGame, resetGameState } from './gameStoreHelpers';

function applyHalftimeTransition(state: GameState) {
  state.gameHalf = 2;
  state.team1Timeouts.fill(true);
  state.team2Timeouts.fill(true);
  // Note: Floaters are NOT reset - they're once per game, not per half
  state.isHalftimeBreak = true;
  state.currentPointStartTime = null;
  state.pointTimerPausedElapsed = null;

  if (state.statTrackingEnabled) {
    state.possession = state.startingPossession === 'team1' ? 'team2' : 'team1';
  }
}

export const createLiveGameSlice: GameSliceCreator<LiveGameSlice> = (set, get) => ({
  team2Name: 'Team 2',

  team1BgColor: palette.surface,
  team2BgColor: palette.primary,
  team1Score: 0,
  team2Score: 0,
  team1Timeouts: [true, true],
  team2Timeouts: [true, true],
  team1Floater: true,
  team2Floater: true,
  floaterEnabled: true,
  autoHalftimeEnabled: true,
  gameHalf: 1,
  gameTo: 15,
  baseGameTo: 15,
  isSoftCap: false,
  softCapPending: false,
  timerEndTime: null,
  timerTimeLeft: 90 * 60,
  currentGameStatus: 'fresh',
  isPostGameFlowPending: false,
  currentGameId: null,

  isHalftimeBreak: false,
  halftimeEndTime: null,
  halftimeTimeLeft: DEFAULT_HALFTIME_BREAK_SECONDS,

  pendingTimeoutModal: false,
  timeoutEndTime: null,
  timeoutTimeLeft: DEFAULT_TIMEOUT_SECONDS,

  statTrackingEnabled: false,
  events: [],
  pendingStatEntry: null,
  pointTimerEnabled: false, // Optional: show "Start Point" button for accurate timing
  currentPointStartTime: null, // Working timestamp for current point
  pointStartTimestamps: {}, // Finalized timestamps for completed points
  pointTimerPausedElapsed: null, // Elapsed ms when paused (null = running)

  possession: null,
  startingPossession: null,
  pendingTurnoverEntry: null,
  eventToastSignal: null,

  currentPoint: 1,

  currentLine: [],
  pointLines: [],
  lineConfirmedForNextPoint: false,

  setTeam2Name: (name: string) =>
    set((state: GameState) => {
      state.team2Name = name;
    }),

  setTeamBgColor: (team: 'team1' | 'team2', color: string) =>
    set((state: GameState) => {
      if (team === 'team1') state.team1BgColor = color;
      else state.team2BgColor = color;
    }),

  setFloaterEnabled: (enabled: boolean) =>
    set((state: GameState) => {
      state.floaterEnabled = enabled;
    }),

  setAutoHalftimeEnabled: (enabled: boolean) =>
    set((state: GameState) => {
      state.autoHalftimeEnabled = enabled;
    }),

  setGameTo: (gameTo: number) =>
    set((state: GameState) => {
      state.gameTo = gameTo;
      state.baseGameTo = gameTo;
    }),

  setGameToInGame: (newGameTo: number) =>
    set((state: GameState) => {
      if (state.gameHalf !== 1) {
        return;
      }

      if (state.isSoftCap || state.softCapPending) {
        return;
      }

      const maxScore = Math.max(state.team1Score, state.team2Score);
      const minimumGameTo = state.autoHalftimeEnabled ? 2 * maxScore + 1 : maxScore + 1;

      if (newGameTo < minimumGameTo) {
        return;
      }

      state.gameTo = newGameTo;
      state.baseGameTo = newGameTo;
    }),

  incrementScore: (isTeam1: boolean) => {
    let didIncrement = false;
    let isHalftime = false;
    let triggeredSoftcap = false;
    set((state: GameState) => {
      // Guard: Prevent scoring past gameTo (race condition prevention)
      // This is a simpler check than checkGameOver to allow mid-point scoring at hardcap.
      // The full game-over logic (including hardcap) is checked by consumers after the score.
      const team1AtTarget = state.team1Score >= state.gameTo;
      const team2AtTarget = state.team2Score >= state.gameTo;
      const notTied = state.team1Score !== state.team2Score;
      if ((team1AtTarget || team2AtTarget) && notTied) return;

      const currentScore = isTeam1 ? state.team1Score : state.team2Score;
      const newScore = currentScore + 1;
      const halftimeScore = Math.ceil(state.baseGameTo / 2);
      const isHalftimeGoal =
        state.autoHalftimeEnabled && state.gameHalf === 1 && newScore === halftimeScore;

      // Update score FIRST
      if (isTeam1) {
        state.team1Score = newScore;
      } else {
        state.team2Score = newScore;
        state.eventToastSignal = {
          id: Date.now(),
          kind: 'opponentGoal',
        } satisfies EventToastSignal;
      }

      didIncrement = true;
      isHalftime = isHalftimeGoal;

      // Soft Cap Logic - per USAU 6.D.1:
      // "At the soft cap, play continues until the current scoring attempt is completed.
      //  If, after the current scoring attempt is completed, the game total has not yet
      //  been reached by one team, one is added to the higher score and the resulting
      //  number is the new game total."
      // gameTo is calculated AFTER the point completes (after score increment)
      //
      // At hardcap (timer=0), we skip soft cap adjustment - game ends immediately
      // when one team is ahead (universe point rule).
      const gameClockSecondsLeft = getGameClockSecondsLeft(state, Date.now());
      const isHardcap = gameClockSecondsLeft === 0;
      if (state.softCapPending && !state.isSoftCap && !isHardcap) {
        state.isSoftCap = true;
        state.softCapPending = false;
        triggeredSoftcap = true;
        const highestScore = Math.max(state.team1Score, state.team2Score);

        if (highestScore < state.gameTo) {
          state.gameTo = highestScore + 1;
        }
      }

      // Skip if game is won (soft cap may have reduced gameTo to halftime score,
      // or hardcap means game ends when one team is ahead)
      const gameWon = checkGameOver({
        team1Score: state.team1Score,
        team2Score: state.team2Score,
        gameTo: state.gameTo,
        gameClockSecondsLeft,
      });
      if (isHalftimeGoal && !gameWon) {
        applyHalftimeTransition(state);
      } else if (gameWon) {
        isHalftime = false;
      }

      const triggeredHalftime = isHalftime;

      state.currentPoint++;

      if (!state.statTrackingEnabled) {
        state.events.push({
          type: 'goal',
          team: isTeam1 ? 'team1' : 'team2',
          goalPlayerId: null,
          assistPlayerId: null,
          pointNumber: state.currentPoint - 1, // currentPoint already incremented
          ...(triggeredHalftime && { triggeredHalftime: true }),
          ...(triggeredSoftcap && { triggeredSoftcap: true }),
        });
        return;
      }

      // Set possession: halftime flips to non-starting team, otherwise to non-scoring team
      if (!triggeredHalftime) {
        state.possession = isTeam1 ? 'team2' : 'team1';
      }

      // Save point start timestamp to the record (currentPoint was already incremented)
      if (state.currentPointStartTime !== null) {
        state.pointStartTimestamps[state.currentPoint - 1] = state.currentPointStartTime;
      }
      const elapsedMs =
        state.currentPointStartTime !== null
          ? (state.pointTimerPausedElapsed ?? Date.now() - state.currentPointStartTime)
          : undefined;

      // Push goal event immediately (with null players for now)
      // This ensures score and events stay in sync even if stat entry is dismissed
      state.events.push({
        type: 'goal',
        team: isTeam1 ? 'team1' : 'team2',
        goalPlayerId: null,
        assistPlayerId: null,
        elapsedMs,
        pointNumber: state.currentPoint - 1, // currentPoint already incremented
        ...(triggeredHalftime && { triggeredHalftime: true }),
        ...(triggeredSoftcap && { triggeredSoftcap: true }),
      });
      state.currentPointStartTime = null;
      state.pointTimerPausedElapsed = null;

      // Team1 goal: open stat entry sheet to update goal/assist players
      if (isTeam1) {
        state.pendingStatEntry = { team: 'team1', pointNumber: newScore };
      }
    });
    return { didIncrement, isHalftime };
  },

  triggerHalftimeEarly: () => {
    let didTrigger = false;

    set((state: GameState) => {
      if (!canTriggerHalftimeEarly(state, getGameClockSecondsLeft(state, Date.now()))) {
        return;
      }

      const lastEvent = state.events[state.events.length - 1];
      if (lastEvent?.type !== 'goal') return;
      lastEvent.triggeredHalftime = true;
      applyHalftimeTransition(state);
      didTrigger = true;
    });

    return didTrigger;
  },

  undoLastAction: () => {
    let result = false;
    set((state: GameState) => {
      const lastEvent = state.events[state.events.length - 1];
      if (!lastEvent) {
        result = false;
        return;
      }
      // Snapshot before any mutation so we can reference it in the signal
      const undoneEventSnapshot = current(lastEvent);

      if (lastEvent.type === 'timeout') {
        // Resume point timer if it was running before the timeout
        const pausedElapsed = state.pointTimerPausedElapsed;
        if (lastEvent.pointTimerWasPaused === false && pausedElapsed !== null) {
          state.currentPointStartTime = Date.now() - pausedElapsed;
          state.pointTimerPausedElapsed = null;
        }
        // Undoing the timeout should also clear timeout UI/timer state
        state.pendingTimeoutModal = false;
        state.timeoutEndTime = null;
        state.timeoutTimeLeft = DEFAULT_TIMEOUT_SECONDS;
        state.events.pop();
      } else if (lastEvent.type === 'goal') {
        const isTeam1 = lastEvent.team === 'team1';
        const targetScore = isTeam1 ? state.team1Score : state.team2Score;

        if (targetScore <= 0) {
          result = false;
          return;
        }

        if (isTeam1) state.team1Score--;
        else state.team2Score--;

        if (lastEvent.triggeredSoftcap) {
          state.isSoftCap = false;
          state.softCapPending = true;
          state.gameTo = state.baseGameTo;
        }

        state.possession = lastEvent.team;
        state.pendingStatEntry = null;
        state.currentPoint = Math.max(1, state.currentPoint - 1);
        // Restore point timer state from the undone point
        // Resume timer running from where it left off by adjusting start time
        if (lastEvent.elapsedMs !== undefined) {
          state.currentPointStartTime = Date.now() - lastEvent.elapsedMs;
          state.pointTimerPausedElapsed = null;
        } else {
          state.currentPointStartTime = null;
          state.pointTimerPausedElapsed = null;
        }
        // Remove entry from pointStartTimestamps since point is in-progress again
        delete state.pointStartTimestamps[state.currentPoint];
        // Remove any line records for future points
        // (user may have set a line for the next point before undoing)
        // Use <= because currentPoint now represents the in-progress point we're reverting to
        state.pointLines = state.pointLines.filter(
          (record) => record.pointNumber <= state.currentPoint,
        );
        state.currentLine = getLatestLineForPoint(state.pointLines, state.currentPoint);
        state.lineConfirmedForNextPoint = false;
        state.events.pop();
      } else {
        // Turnover: flip possession back
        state.possession = state.possession === 'team1' ? 'team2' : 'team1';
        state.pendingTurnoverEntry = null;
        state.events.pop();
      }

      const halftimeReached = hasReachedHalftime(state.events, state.autoHalftimeEnabled);
      state.gameHalf = halftimeReached ? 2 : 1;
      if (!halftimeReached) {
        state.isHalftimeBreak = false;
      }

      // Re-derive timeout state from remaining events
      // This ensures correct state after undoing across halftime
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

      state.currentGameStatus = 'inProgress';
      state.isPostGameFlowPending = false;
      state.eventToastSignal = { id: Date.now(), kind: 'undo', event: undoneEventSnapshot };
      result = true;
    });
    return result;
  },

  toggleTimeout: (isTeam1: boolean, index: number) =>
    set((state: GameState) => {
      const timeouts = isTeam1 ? state.team1Timeouts : state.team2Timeouts;
      const isFloater = index >= timeouts.length;

      let isAvailable = timeouts[index];
      if (isFloater) {
        isAvailable = isTeam1 ? state.team1Floater : state.team2Floater;
      }

      if (!isAvailable) return; // Already used - must undo to restore

      // Floater rule: can't use if regular timeouts remain
      if (isFloater && timeouts.some((t) => t)) return;

      const startTime = state.currentPointStartTime;
      const pointTimerWasRunning = startTime !== null && state.pointTimerPausedElapsed === null;

      if (pointTimerWasRunning && startTime !== null) {
        state.pointTimerPausedElapsed = Date.now() - startTime;
      }

      // Calculate elapsed for timeline positioning
      const elapsedMs =
        state.currentPointStartTime !== null
          ? (state.pointTimerPausedElapsed ?? Date.now() - state.currentPointStartTime)
          : undefined;

      state.events.push({
        type: 'timeout',
        team: isTeam1 ? 'team1' : 'team2',
        index: isFloater ? 0 : index,
        isFloater,
        elapsedMs,
        pointTimerWasPaused: !pointTimerWasRunning,
        pointNumber: state.currentPoint,
      });

      // Update cached state for immediate UI feedback
      if (isFloater) {
        if (isTeam1) state.team1Floater = false;
        else state.team2Floater = false;
      } else {
        timeouts[index] = false;
      }

      state.pendingTimeoutModal = true;
    }),

  resetTimeouts: (count: number) =>
    set((state: GameState) => {
      state.team1Timeouts = Array.from({ length: count }, () => true);
      state.team2Timeouts = Array.from({ length: count }, () => true);
    }),

  resetGame: () => {
    const hardCapMinutes = useSettingsStore.getState().hardCapMins;
    set((state: GameState) => {
      resetGameState(state, hardCapMinutes);
    });
    useSettingsStore.getState().setFirstPointRatio(null);
  },
  setSoftCapPending: (pending: boolean) =>
    set((state: GameState) => {
      state.softCapPending = pending;
    }),

  startGameClock: () =>
    set((state: GameState) => {
      if (state.timerEndTime !== null) return;
      state.timerEndTime = Date.now() + state.timerTimeLeft * 1000;
    }),

  pauseGameClock: () =>
    set((state: GameState) => {
      state.timerTimeLeft = getGameClockSecondsLeft(state, Date.now());
      state.timerEndTime = null;
    }),

  expireGameClock: () =>
    set((state: GameState) => {
      state.timerTimeLeft = 0;
      state.timerEndTime = null;
    }),

  resetGameClock: (seconds: number) =>
    set((state: GameState) => {
      state.timerTimeLeft = seconds;
      state.timerEndTime = null;
    }),

  setTimerTimeLeft: (seconds: number) =>
    set((state: GameState) => {
      state.timerTimeLeft = seconds;
    }),

  setCurrentGameStatus: (status) =>
    set((state: GameState) => {
      state.currentGameStatus = status;
    }),

  setPostGameFlowPending: (pending) =>
    set((state: GameState) => {
      state.isPostGameFlowPending = pending;
    }),

  setHalftimeBreak: (active: boolean) =>
    set((state: GameState) => {
      state.isHalftimeBreak = active;
    }),

  setHalftimeEndTime: (time: number | null) =>
    set((state: GameState) => {
      state.halftimeEndTime = time;
    }),

  setHalftimeTimeLeft: (seconds: number) =>
    set((state: GameState) => {
      state.halftimeTimeLeft = seconds;
    }),

  clearHalftimeBreak: () =>
    set((state: GameState) => {
      state.isHalftimeBreak = false;
      state.halftimeEndTime = null;
      state.halftimeTimeLeft = DEFAULT_HALFTIME_BREAK_SECONDS;
    }),

  setPendingTimeoutModal: (pending: boolean) =>
    set((state: GameState) => {
      state.pendingTimeoutModal = pending;
    }),

  setTimeoutEndTime: (time: number | null) =>
    set((state: GameState) => {
      state.timeoutEndTime = time;
    }),

  setTimeoutTimeLeft: (seconds: number) =>
    set((state: GameState) => {
      state.timeoutTimeLeft = seconds;
    }),

  clearTimeoutModal: () =>
    set((state: GameState) => {
      state.pendingTimeoutModal = false;
      state.timeoutEndTime = null;
      state.timeoutTimeLeft = DEFAULT_TIMEOUT_SECONDS;
    }),

  setStatTrackingEnabled: (enabled: boolean) =>
    set((state: GameState) => {
      state.statTrackingEnabled = enabled;
    }),

  addGoalEvent: (event: { goalPlayerId: string | null; assistPlayerId: string | null }) =>
    set((state: GameState) => {
      // Update the last goal event (already pushed in incrementScore)
      const lastEvent = state.events[state.events.length - 1];
      if (lastEvent?.type === 'goal') {
        lastEvent.goalPlayerId = event.goalPlayerId;
        lastEvent.assistPlayerId = event.assistPlayerId;
      }
      state.pendingStatEntry = null;
    }),

  clearPendingStatEntry: () =>
    set((state: GameState) => {
      state.pendingStatEntry = null;
    }),

  // Cancel a pending goal entry - reverts the score and removes the goal event.
  // This and undoLastAction each re-derive score, possession, point number, line history,
  // halftime, and point-timer state; a change to goal, turnover, timeout, halftime, line, or
  // timer semantics must update both paths.
  cancelPendingGoal: () =>
    set((state: GameState) => {
      if (!state.pendingStatEntry) return;

      const lastEvent = state.events[state.events.length - 1];
      if (lastEvent?.type !== 'goal') return;

      // Revert the score (stat entry only shows for team1 goals)
      state.team1Score--;

      if (lastEvent.triggeredSoftcap) {
        state.isSoftCap = false;
        state.softCapPending = true;
        state.gameTo = state.baseGameTo;
      }

      // Restore point timer state from the goal event
      if (lastEvent.elapsedMs !== undefined) {
        state.currentPointStartTime = Date.now() - lastEvent.elapsedMs;
        state.pointTimerPausedElapsed = null;
      }

      state.events.pop();

      const halftimeReached = hasReachedHalftime(state.events, state.autoHalftimeEnabled);
      state.gameHalf = halftimeReached ? 2 : 1;
      if (!halftimeReached) {
        state.isHalftimeBreak = false;
      }

      // Reset possession to team1 (they were attacking)
      state.possession = 'team1';

      state.currentPoint = Math.max(1, state.currentPoint - 1);

      delete state.pointStartTimestamps[state.currentPoint];

      // Remove any future line records and restore the active line for the reverted point
      state.pointLines = state.pointLines.filter(
        (record) => record.pointNumber <= state.currentPoint,
      );
      state.currentLine = getLatestLineForPoint(state.pointLines, state.currentPoint);
      state.lineConfirmedForNextPoint = false;

      state.pendingStatEntry = null;

      // Re-derive timeout state from remaining events. The canceled goal may have
      // triggered halftime, which temporarily reset the cached timeout state.
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
    }),

  setPointTimerEnabled: (enabled: boolean) =>
    set((state: GameState) => {
      state.pointTimerEnabled = enabled;
    }),

  startPoint: () =>
    set((state: GameState) => {
      state.currentPointStartTime = Date.now();
      state.pointTimerPausedElapsed = null;
    }),

  togglePointTimerPause: () =>
    set((state: GameState) => {
      if (state.currentPointStartTime === null) return;

      if (state.pointTimerPausedElapsed === null) {
        // Currently running -> pause: store elapsed time
        state.pointTimerPausedElapsed = Date.now() - state.currentPointStartTime;
      } else {
        // Currently paused -> resume: adjust start time to maintain elapsed
        state.currentPointStartTime = Date.now() - state.pointTimerPausedElapsed;
        state.pointTimerPausedElapsed = null;
      }
    }),

  setPossession: (team: 'team1' | 'team2') =>
    set((state: GameState) => {
      state.possession = team;
      if (state.startingPossession === null) {
        state.startingPossession = team;
      }
      if (state.currentGameStatus === 'fresh') {
        state.currentGameStatus = 'inProgress';
      }
    }),

  triggerTurnover: () =>
    set((state: GameState) => {
      if (state.possession === null) return;
      const receivingTeam = state.possession === 'team1' ? 'team2' : 'team1';
      state.pendingTurnoverEntry = { receivingTeam };
    }),

  addTurnoverEvent: (event: {
    team: 'team1' | 'team2';
    subtype: TurnoverType;
    playerId: string | null;
    player2Id?: string | null;
  }) =>
    set((state: GameState) => {
      // Turnovers can only be recorded when timer is running (UI shows Resume when paused)
      const elapsedMs =
        state.currentPointStartTime !== null ? Date.now() - state.currentPointStartTime : undefined;
      const playerId =
        event.team === 'team1' && event.playerId === null ? UNKNOWN_PLAYER_ID : event.playerId;
      const player2Id =
        event.team === 'team1' && event.player2Id === null ? UNKNOWN_PLAYER_ID : event.player2Id;
      const turnoverEvent: TurnoverEvent = {
        type: 'turnover',
        team: event.team,
        subtype: event.subtype,
        playerId,
        player2Id,
        elapsedMs,
        pointNumber: state.currentPoint,
      };
      state.events.push(turnoverEvent);
      state.eventToastSignal = { id: Date.now(), kind: 'turnover', event: turnoverEvent };
      state.possession = state.possession === 'team1' ? 'team2' : 'team1';
      state.pendingTurnoverEntry = null;
    }),

  clearEventToastSignal: () =>
    set((state: GameState) => {
      state.eventToastSignal = null;
    }),

  // Cancel pending turnover entry - just clears without flipping possession
  // The turnover event was never recorded, so no state change needed
  clearPendingTurnoverEntry: () =>
    set((state: GameState) => {
      state.pendingTurnoverEntry = null;
    }),

  setCurrentLine: (playerIds: string[]) =>
    set((state: GameState) => {
      state.currentLine = playerIds;
    }),

  recordLineForPoint: (
    pointNumber: number,
    isSubstitution?: boolean,
    subType?: 'injury' | 'replacement',
  ) =>
    set((state: GameState) => {
      const timestamp = Date.now();
      const lastRecord = state.pointLines.findLast((r) => r.pointNumber === pointNumber);

      if (isSubstitution && subType === 'replacement') {
        state.pointLines = replacePointLineRecords(
          state.pointLines,
          pointNumber,
          state.currentLine,
          timestamp,
        );
        return;
      }
      // Injury sub: skip if lineup is identical to the last record for this point
      if (isSubstitution && subType === 'injury') {
        if (lastRecord) {
          const isSame =
            lastRecord.playerIds.length === state.currentLine.length &&
            lastRecord.playerIds.every((id) => state.currentLine.includes(id));
          if (isSame) return;
        }
      }

      const subbedInPlayerIds =
        isSubstitution && subType === 'injury' && lastRecord
          ? state.currentLine.filter((id) => !lastRecord.playerIds.includes(id))
          : undefined;
      const subbedOutPlayerIds =
        isSubstitution && subType === 'injury' && lastRecord
          ? lastRecord.playerIds.filter((id) => !state.currentLine.includes(id))
          : undefined;

      // Injury sub or initial line: append a new record
      state.pointLines.push({
        pointNumber,
        playerIds: [...state.currentLine],
        timestamp,
        isSubstitution,
        substitutionType: isSubstitution && subType === 'injury' ? 'injury' : undefined,
        subbedInPlayerIds,
        subbedOutPlayerIds,
      });
    }),

  // A completed-point line correction on the current game also updates that game's saved
  // record, and vice versa (replaceSavedGamePointLine). Otherwise a correction made after
  // undoing a finished game is overwritten when the resumed game is saved again.
  replacePointLine: async (pointNumber: number, playerIds: string[]): Promise<boolean> => {
    const state = get();
    if (pointNumber >= state.currentPoint) return false;
    if (!canReplacePointLine(state.pointLines, pointNumber, playerIds, getCurrentTeam().roster)) {
      return false;
    }

    const timestamp = Date.now();
    const savedGame = state.savedGames.find((game) => game.id === state.currentGameId);
    const savedPointLines = savedGame?.pointLines;
    const canReplaceSavedGameLine =
      savedGame != null &&
      savedPointLines != null &&
      canReplacePointLine(savedPointLines, pointNumber, playerIds, savedGame.team1.roster);
    const updatedSavedGame: SavedGame | null = canReplaceSavedGameLine
      ? {
          ...savedGame,
          pointLines: replacePointLineRecords(savedPointLines, pointNumber, playerIds, timestamp),
        }
      : null;

    // The saved game goes to SQLite before this store changes; see savedGamesSlice.ts.
    if (updatedSavedGame) await upsertBasicGames([updatedSavedGame]);
    await set((draft: GameState) => {
      draft.pointLines = replacePointLineRecords(
        draft.pointLines,
        pointNumber,
        playerIds,
        timestamp,
      );
      if (updatedSavedGame) putSavedGame(draft, updatedSavedGame);
    });
    return true;
  },

  updateEvent: (
    eventIndex: number,
    updates: {
      playerId?: string | null;
      player2Id?: string | null;
      subtype?: TurnoverType;
      team?: 'team1' | 'team2';
      goalPlayerId?: string | null;
      assistPlayerId?: string | null;
      elapsedMs?: number | null;
    },
  ) =>
    set((state: GameState) => {
      const event = state.events[eventIndex];
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
        const isCallahan = event.assistPlayerId === 'OTHER_TEAM';

        if (updates.goalPlayerId !== undefined) event.goalPlayerId = updates.goalPlayerId;
        if (updates.assistPlayerId !== undefined) event.assistPlayerId = updates.assistPlayerId;

        // For Callahans: also update our block immediately before (edits can leave another event there)
        if (isCallahan && updates.goalPlayerId !== undefined && eventIndex > 0) {
          const prevEvent = state.events[eventIndex - 1];
          if (
            prevEvent.type === 'turnover' &&
            prevEvent.subtype === 'block' &&
            prevEvent.team === 'team1'
          ) {
            prevEvent.playerId = updates.goalPlayerId;
          }
        }
      }
    }),

  deleteEvent: (eventIndex: number) => {
    let result = false;
    set((state: GameState) => {
      const event = state.events[eventIndex];
      if (!event) {
        result = false;
        return;
      }

      // Block deletion of goals (and implicitly assists, since they're part of goal events)
      if (event.type === 'goal') {
        result = false;
        return;
      }

      state.events.splice(eventIndex, 1);
      result = true;
    });
    return result;
  },

  setLineConfirmedForNextPoint: (confirmed: boolean) =>
    set((state: GameState) => {
      state.lineConfirmedForNextPoint = confirmed;
    }),
});
