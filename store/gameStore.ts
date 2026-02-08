import { checkGameOver } from '@/lib/gameUtils';
import { CURRENT_SCHEMA_VERSION, SavedGame, SavedTeam, storage } from '@/lib/storage';
import { deriveTimeoutState } from '@/lib/timeoutUtils';
import { generateId } from '@/lib/utils';
import { palette } from '@/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { GameState, TurnoverType } from './gameStore.types';
import { useLinePresetsStore } from './linePresetsStore';
import { useSettingsStore } from './settingsStore';

export const useGameStore = create<GameState>()(
  immer(
    persist(
      (set, get) => ({
        // Teams - default to Team 1 so addPlayer always has a team to work with
        currentTeam: { id: generateId(), name: 'Team 1', roster: [] },
        team2Name: 'Team 2',

        // Team colors and game state
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
        gameLength: 90,
        isSoftCap: false,
        softCapPending: false,
        softCapMins: 20,
        timerIsActive: false,
        timerEndTime: null,
        timerTimeLeft: 90 * 60,
        gameLocked: false,
        currentGameId: null,

        // Halftime Break Initial State
        isHalftimeBreak: false,
        halftimeEndTime: null,
        halftimeTimeLeft: 7 * 60, // 7 minutes default

        // Timeout Modal Initial State
        pendingTimeoutModal: false,
        timeoutEndTime: null,
        timeoutTimeLeft: 70, // 70 seconds default

        // Stat Tracking Initial State
        statTrackingEnabled: false,
        events: [], // Unified event log
        pendingStatEntry: null,
        pointTimerEnabled: false, // Optional: show "Start Point" button for accurate timing
        currentPointStartTime: null, // Working timestamp for current point
        pointStartTimestamps: {}, // Finalized timestamps for completed points
        pointTimerPausedElapsed: null, // Elapsed ms when paused (null = running)

        // Turnover Tracking Initial State
        possession: null,
        startingPossession: null,
        pendingTurnoverEntry: null,

        // Point tracking for timeline
        currentPoint: 1,

        // Line Calling Initial State
        currentLine: [],
        pointLines: [],

        // Saved Games & Teams Initial State
        savedGames: [],
        savedTeams: [],

        setCurrentTeam: (team: SavedTeam) =>
          set((state: GameState) => {
            state.currentTeam = team;
          }),

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

        setGameLength: (minutes: number) =>
          set((state: GameState) => {
            state.gameLength = minutes;
            state.timerTimeLeft = minutes * 60;
          }),

        incrementScore: (isTeam1: boolean) => {
          let didIncrement = false;
          let isHalftime = false;
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
            if (isTeam1) state.team1Score = newScore;
            else state.team2Score = newScore;

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
            const isHardcap = state.timerTimeLeft === 0;
            if (state.softCapPending && !state.isSoftCap && !isHardcap) {
              state.isSoftCap = true;
              state.softCapPending = false;
              const highestScore = Math.max(state.team1Score, state.team2Score);

              // Only adjust gameTo if the game total hasn't been reached yet
              if (highestScore < state.gameTo) {
                state.gameTo = highestScore + 1;
              }
            }

            // Halftime: reset timeouts and set halftime break
            // Skip if game is won (soft cap may have reduced gameTo to halftime score,
            // or hardcap means game ends when one team is ahead)
            const gameWon = checkGameOver({
              team1Score: state.team1Score,
              team2Score: state.team2Score,
              gameTo: state.gameTo,
              timerTimeLeft: state.timerTimeLeft,
            });
            if (isHalftimeGoal && !gameWon) {
              state.gameHalf = 2;
              state.team1Timeouts.fill(true);
              state.team2Timeouts.fill(true);
              // Note: Floaters are NOT reset - they're once per game, not per half
              state.isHalftimeBreak = true;
            } else if (gameWon) {
              isHalftime = false;
            }

            state.currentPoint++;

            // Early return if stat tracking is disabled
            if (!state.statTrackingEnabled) {
              state.events.push({
                type: 'goal',
                team: isTeam1 ? 'team1' : 'team2',
                goalPlayerId: null,
                assistPlayerId: null,
              });
              return;
            }

            // --- Stat tracking enabled below ---

            // Set possession: halftime flips to non-starting team, otherwise to non-scoring team
            if (isHalftimeGoal) {
              state.possession = state.startingPossession === 'team1' ? 'team2' : 'team1';
            } else {
              state.possession = isTeam1 ? 'team2' : 'team1';
            }

            // Save point start timestamp to the record (currentPoint was already incremented)
            if (state.currentPointStartTime !== null) {
              state.pointStartTimestamps[state.currentPoint - 1] = state.currentPointStartTime;
            }
            // Calculate elapsed game time (ms since point start)
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

        undoLastAction: () => {
          let result = false;
          set((state: GameState) => {
            const lastEvent = state.events[state.events.length - 1];
            if (!lastEvent) {
              result = false;
              return;
            }

            if (lastEvent.type === 'timeout') {
              // Resume point timer if it was running before the timeout
              const pausedElapsed = state.pointTimerPausedElapsed;
              if (lastEvent.pointTimerWasPaused === false && pausedElapsed !== null) {
                state.currentPointStartTime = Date.now() - pausedElapsed;
                state.pointTimerPausedElapsed = null;
              }
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

              // Reset gameHalf to 1 if undo brings both scores below halftime threshold
              const halftimeScore = Math.ceil(state.baseGameTo / 2);
              if (state.team1Score < halftimeScore && state.team2Score < halftimeScore) {
                state.gameHalf = 1;
              }

              state.possession = lastEvent.team;
              state.pendingStatEntry = null;
              state.currentPoint = Math.max(1, state.currentPoint - 1);
              // Restore point timer state from the undone point
              // Resume timer running from where it left off by adjusting start time
              if (lastEvent.elapsedMs !== undefined) {
                // Set start time so elapsed = elapsedMs (timer resumes running)
                state.currentPointStartTime = Date.now() - lastEvent.elapsedMs;
                state.pointTimerPausedElapsed = null;
              } else {
                state.currentPointStartTime = null;
                state.pointTimerPausedElapsed = null;
              }
              // Remove entry from pointStartTimestamps since point is in-progress again
              delete state.pointStartTimestamps[state.currentPoint];
              // Remove any line records for the undone point and any future points
              // (user may have set a line for the next point before undoing)
              state.pointLines = state.pointLines.filter(
                (record) => record.pointNumber < state.currentPoint,
              );
              state.events.pop();
            } else {
              // Turnover: flip possession back
              state.possession = state.possession === 'team1' ? 'team2' : 'team1';
              state.pendingTurnoverEntry = null;
              state.events.pop();
            }

            // Re-derive timeout state from remaining events
            // This ensures correct state after undoing across halftime
            const derived = deriveTimeoutState(
              state.events,
              state.baseGameTo,
              state.autoHalftimeEnabled,
            );
            state.team1Timeouts = derived.team1Timeouts;
            state.team2Timeouts = derived.team2Timeouts;
            state.team1Floater = derived.team1Floater;
            state.team2Floater = derived.team2Floater;

            state.gameLocked = false;
            result = true;
          });
          return result;
        },

        toggleTimeout: (isTeam1: boolean, index: number) =>
          set((state: GameState) => {
            const timeouts = isTeam1 ? state.team1Timeouts : state.team2Timeouts;
            const isFloater = index >= timeouts.length;

            // Check if timeout is available
            const isAvailable = isFloater
              ? isTeam1
                ? state.team1Floater
                : state.team2Floater
              : timeouts[index];

            if (!isAvailable) return; // Already used - must undo to restore

            // Floater rule: can't use if regular timeouts remain
            if (isFloater && timeouts.some((t) => t)) return;

            // Check point timer state before pausing
            const startTime = state.currentPointStartTime;
            const pointTimerWasRunning =
              startTime !== null && state.pointTimerPausedElapsed === null;

            // Pause point timer if running
            if (pointTimerWasRunning && startTime !== null) {
              state.pointTimerPausedElapsed = Date.now() - startTime;
            }

            // Calculate elapsed for timeline positioning
            const elapsedMs =
              state.currentPointStartTime !== null
                ? (state.pointTimerPausedElapsed ?? Date.now() - state.currentPointStartTime)
                : undefined;

            // Push timeout event
            state.events.push({
              type: 'timeout',
              team: isTeam1 ? 'team1' : 'team2',
              index: isFloater ? 0 : index,
              isFloater,
              elapsedMs,
              pointTimerWasPaused: !pointTimerWasRunning,
            });

            // Update cached state for immediate UI feedback
            if (isFloater) {
              if (isTeam1) state.team1Floater = false;
              else state.team2Floater = false;
            } else {
              timeouts[index] = false;
            }

            // Flag for modal rendering
            state.pendingTimeoutModal = true;
          }),

        resetTimeouts: (count: number) =>
          set((state: GameState) => {
            state.team1Timeouts = new Array(count).fill(true);
            state.team2Timeouts = new Array(count).fill(true);
          }),

        resetGame: () =>
          set((state: GameState) => {
            state.team1Score = 0;
            state.team2Score = 0;
            state.team1Timeouts.fill(true);
            state.team2Timeouts.fill(true);
            state.team1Floater = true;
            state.team2Floater = true;
            state.gameHalf = 1;
            state.isSoftCap = false;
            state.softCapPending = false;
            state.gameTo = state.baseGameTo;
            state.events = [];
            state.pendingStatEntry = null;
            state.possession = null;
            state.startingPossession = null;
            state.pendingTurnoverEntry = null;
            state.currentPoint = 1;
            state.timerIsActive = false;
            state.timerEndTime = null;
            state.timerTimeLeft = state.gameLength * 60;
            state.gameLocked = false;
            state.currentGameId = null;
            state.isHalftimeBreak = false;
            state.halftimeEndTime = null;
            state.halftimeTimeLeft = 7 * 60;
            state.pendingTimeoutModal = false;
            state.timeoutEndTime = null;
            state.timeoutTimeLeft = 70;
            state.currentPointStartTime = null;
            state.pointStartTimestamps = {};
            state.pointTimerPausedElapsed = null;

            // Reset line calling state
            state.currentLine = [];
            state.pointLines = [];

            // Reset game-specific settings in settingsStore
            useSettingsStore.getState().setFirstPointRatio(null);
          }),
        setSoftCapPending: (pending: boolean) =>
          set((state: GameState) => {
            state.softCapPending = pending;
          }),

        setSoftCapMins: (minutes: number) =>
          set((state: GameState) => {
            state.softCapMins = minutes;
          }),

        setTimerActive: (active: boolean) =>
          set((state: GameState) => {
            state.timerIsActive = active;
          }),

        setTimerEndTime: (time: number | null) =>
          set((state: GameState) => {
            state.timerEndTime = time;
          }),

        setTimerTimeLeft: (seconds: number) =>
          set((state: GameState) => {
            state.timerTimeLeft = seconds;
          }),

        setGameLocked: (locked: boolean) =>
          set((state: GameState) => {
            state.gameLocked = locked;
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
            state.halftimeTimeLeft = 7 * 60;
          }),

        // Timeout Modal Actions
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
            state.timeoutTimeLeft = 70;
          }),

        // Stat Tracking Actions
        setStatTrackingEnabled: (enabled: boolean) =>
          set((state: GameState) => {
            state.statTrackingEnabled = enabled;
          }),

        addPlayer: (name: string) => {
          const trimmedName = name.trim();
          if (!trimmedName) return null;
          // Check if name already exists (case-insensitive)
          const state = get();
          const lowerName = trimmedName.toLowerCase();
          if (state.currentTeam.roster.some((p) => p.name.toLowerCase() === lowerName)) return null;
          const newId = generateId();
          set((s: GameState) => {
            s.currentTeam.roster.push({
              id: newId,
              name: trimmedName,
              isActive: true,
              matchingType: null,
              role: null,
            });
          });
          return newId;
        },

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

        // Cancel a pending goal entry - reverts the score and removes the goal event
        cancelPendingGoal: () =>
          set((state: GameState) => {
            if (!state.pendingStatEntry) return;

            const lastEvent = state.events[state.events.length - 1];
            if (lastEvent?.type !== 'goal') return;

            // Revert the score (stat entry only shows for team1 goals)
            state.team1Score--;

            // Restore point timer state from the goal event
            if (lastEvent.elapsedMs !== undefined) {
              state.currentPointStartTime = Date.now() - lastEvent.elapsedMs;
              state.pointTimerPausedElapsed = null;
            }

            // Reset halftime if needed (same logic as undoLastAction)
            const halftimeScore = Math.ceil(state.baseGameTo / 2);
            if (state.team1Score < halftimeScore && state.team2Score < halftimeScore) {
              state.gameHalf = 1;
              // Cancel halftime break if it was triggered by this goal
              state.isHalftimeBreak = false;
            }

            // Remove the goal event
            state.events.pop();

            // Reset possession to team1 (they were attacking)
            state.possession = 'team1';

            // Decrement current point
            state.currentPoint = Math.max(1, state.currentPoint - 1);

            // Remove entry from pointStartTimestamps
            delete state.pointStartTimestamps[state.currentPoint];

            // Clear pending entry
            state.pendingStatEntry = null;
          }),

        clearRoster: () =>
          set((state: GameState) => {
            if (!state.currentTeam) return;
            const teamId = state.currentTeam.id;
            state.currentTeam.roster = [];
            state.events = [];

            // Side effect: clear presets for this team as roster is gone
            useLinePresetsStore.getState().clearPresetsForTeam(teamId);
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

        // Turnover Tracking Actions
        setPossession: (team: 'team1' | 'team2') =>
          set((state: GameState) => {
            state.possession = team;
            if (state.startingPossession === null) {
              state.startingPossession = team;
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
              state.currentPointStartTime !== null
                ? Date.now() - state.currentPointStartTime
                : undefined;
            state.events.push({
              type: 'turnover',
              team: event.team,
              subtype: event.subtype,
              playerId: event.playerId,
              player2Id: event.player2Id,
              elapsedMs,
            });
            state.possession = state.possession === 'team1' ? 'team2' : 'team1';
            state.pendingTurnoverEntry = null;
          }),

        // Cancel pending turnover entry - just clears without flipping possession
        // The turnover event was never recorded, so no state change needed
        clearPendingTurnoverEntry: () =>
          set((state: GameState) => {
            state.pendingTurnoverEntry = null;
          }),

        // Line Calling Actions
        setCurrentLine: (playerIds: string[]) =>
          set((state: GameState) => {
            state.currentLine = playerIds;
          }),

        recordLineForPoint: (pointNumber: number, isSubstitution?: boolean) =>
          set((state: GameState) => {
            state.pointLines.push({
              pointNumber,
              playerIds: [...state.currentLine],
              timestamp: Date.now(),
              isSubstitution,
            });
          }),

        // Event Editing Actions
        updateEvent: (
          eventIndex: number,
          updates: {
            playerId?: string | null;
            player2Id?: string | null;
            subtype?: TurnoverType;
            team?: 'team1' | 'team2';
            goalPlayerId?: string | null;
            assistPlayerId?: string | null;
          },
        ) =>
          set((state: GameState) => {
            const event = state.events[eventIndex];
            if (!event) return;

            if (event.type === 'turnover') {
              if (updates.playerId !== undefined) event.playerId = updates.playerId;
              if (updates.player2Id !== undefined) event.player2Id = updates.player2Id;
              if (updates.subtype !== undefined) event.subtype = updates.subtype;
              if (updates.team !== undefined) event.team = updates.team;
            } else if (event.type === 'goal') {
              // Check if this is a Callahan (goal with OTHER_TEAM assist)
              const isCallahan = event.assistPlayerId === 'OTHER_TEAM';

              if (updates.goalPlayerId !== undefined) event.goalPlayerId = updates.goalPlayerId;
              if (updates.assistPlayerId !== undefined)
                event.assistPlayerId = updates.assistPlayerId;

              // For Callahans: also update the associated block event (always immediately before)
              if (isCallahan && updates.goalPlayerId !== undefined && eventIndex > 0) {
                const prevEvent = state.events[eventIndex - 1];
                if (prevEvent.type === 'turnover' && prevEvent.subtype === 'block') {
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

            // Safe to delete turnovers
            state.events.splice(eventIndex, 1);
            result = true;
          });
          return result;
        },

        // Saved Game Event Editing Actions
        updateSavedGameEvent: async (
          gameId: string,
          eventIndex: number,
          updates: {
            playerId?: string | null;
            player2Id?: string | null;
            subtype?: TurnoverType;
            team?: 'team1' | 'team2';
            goalPlayerId?: string | null;
            assistPlayerId?: string | null;
          },
        ) => {
          const game = get().savedGames.find((g) => g.id === gameId);
          if (!game) return;

          const event = game.events[eventIndex];
          if (!event) return;

          // Create updated events array
          const updatedEvents = [...game.events];

          // Create updated event based on type
          let updatedEvent;
          if (event.type === 'turnover') {
            updatedEvent = { ...event };
            if (updates.playerId !== undefined) updatedEvent.playerId = updates.playerId;
            if (updates.player2Id !== undefined) updatedEvent.player2Id = updates.player2Id;
            if (updates.subtype !== undefined) updatedEvent.subtype = updates.subtype;
            if (updates.team !== undefined) updatedEvent.team = updates.team;
          } else if (event.type === 'goal') {
            updatedEvent = { ...event };
            const isCallahan = event.assistPlayerId === 'OTHER_TEAM';

            if (updates.goalPlayerId !== undefined)
              updatedEvent.goalPlayerId = updates.goalPlayerId;
            if (updates.assistPlayerId !== undefined)
              updatedEvent.assistPlayerId = updates.assistPlayerId;

            // For Callahans: also update the associated block event (always immediately before)
            if (isCallahan && updates.goalPlayerId !== undefined && eventIndex > 0) {
              const prevEvent = game.events[eventIndex - 1];
              if (prevEvent.type === 'turnover' && prevEvent.subtype === 'block') {
                updatedEvents[eventIndex - 1] = { ...prevEvent, playerId: updates.goalPlayerId };
              }
            }
          } else {
            return;
          }

          // Update the main event
          updatedEvents[eventIndex] = updatedEvent;
          const updatedGame: SavedGame = { ...game, events: updatedEvents };

          // Persist and update state
          await storage.saveGame(updatedGame);
          set((state: GameState) => {
            const idx = state.savedGames.findIndex((g) => g.id === gameId);
            if (idx !== -1) {
              state.savedGames[idx] = updatedGame;
            }
          });
        },

        deleteSavedGameEvent: async (gameId: string, eventIndex: number): Promise<boolean> => {
          const game = get().savedGames.find((g) => g.id === gameId);
          if (!game) return false;

          const event = game.events[eventIndex];
          if (!event) return false;

          // Block deletion of goals
          if (event.type === 'goal') return false;

          // Create updated game with event removed
          const updatedEvents = [...game.events];
          updatedEvents.splice(eventIndex, 1);
          const updatedGame: SavedGame = { ...game, events: updatedEvents };

          // Persist and update state
          await storage.saveGame(updatedGame);
          set((state: GameState) => {
            const idx = state.savedGames.findIndex((g) => g.id === gameId);
            if (idx !== -1) {
              state.savedGames[idx] = updatedGame;
            }
          });
          return true;
        },

        // Saved Games & Teams Actions
        loadSavedGames: async () => {
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        loadSavedTeams: async () => {
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        saveCurrentGame: async () => {
          const state = get();
          // Use existing gameId if we've already saved this game (e.g., after undo+re-win)
          const gameId = state.currentGameId ?? generateId();
          // Stamp gameId on all events for aggregation lookups
          const eventsWithGameId = state.events.map((event) => ({
            ...event,
            gameId,
          }));
          const game: SavedGame = {
            id: gameId,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            createdAt: Date.now(),
            team1: state.currentTeam,
            team2Name: state.team2Name,
            team1Score: state.team1Score,
            team2Score: state.team2Score,
            events: eventsWithGameId,
            gameTo: state.gameTo,
            gameLength: state.gameLength,
            startingPossession: state.startingPossession ?? 'team1',
            pointStartTimestamps: state.pointStartTimestamps,
            pointLines: state.pointLines,
          };
          await storage.saveGame(game);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
            state.currentGameId = gameId; // Remember ID for subsequent saves
          });
        },

        deleteSavedGame: async (id: string) => {
          await storage.deleteGame(id);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        deleteSavedGames: async (ids: string[]) => {
          await storage.deleteGames(ids);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        saveCurrentTeam: async () => {
          const state = get();
          const team = state.currentTeam;

          await storage.saveTeam(team);
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        importGame: async (game: SavedGame) => {
          await storage.saveGame(game);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        importTeam: async (team: SavedTeam) => {
          await storage.saveTeam(team);
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
            // Also update currentTeam if it's the same team (deep copy like loadTeam)
            if (state.currentTeam.id === team.id) {
              state.currentTeam = {
                id: team.id,
                name: team.name,
                roster: team.roster.map((p) => ({ ...p })),
              };
            }
          });
        },

        deleteTeam: async (id: string) => {
          await storage.deleteTeam(id);
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        loadTeam: (teamId: string) => {
          const team = get().savedTeams.find((t) => t.id === teamId);
          if (!team) return;
          set((state: GameState) => {
            // Deep copy to avoid mutating savedTeams
            state.currentTeam = {
              id: team.id,
              name: team.name,
              roster: team.roster.map((p) => ({ ...p })),
            };
          });
        },
      }),
      {
        name: 'ultimatestats-game-storage',
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist game-related state, not UI state like pending entries
        partialize: (state: GameState) => ({
          currentTeam: state.currentTeam,
          team2Name: state.team2Name,
          team1BgColor: state.team1BgColor,
          team2BgColor: state.team2BgColor,
          team1Score: state.team1Score,
          team2Score: state.team2Score,
          team1Timeouts: state.team1Timeouts,
          team2Timeouts: state.team2Timeouts,
          team1Floater: state.team1Floater,
          team2Floater: state.team2Floater,
          floaterEnabled: state.floaterEnabled,
          autoHalftimeEnabled: state.autoHalftimeEnabled,
          gameHalf: state.gameHalf,
          gameTo: state.gameTo,
          baseGameTo: state.baseGameTo,
          gameLength: state.gameLength,
          isSoftCap: state.isSoftCap,
          softCapPending: state.softCapPending,
          softCapMins: state.softCapMins,
          timerTimeLeft: state.timerTimeLeft,
          gameLocked: state.gameLocked,
          currentGameId: state.currentGameId,
          isHalftimeBreak: state.isHalftimeBreak,
          halftimeEndTime: state.halftimeEndTime,
          halftimeTimeLeft: state.halftimeTimeLeft,
          statTrackingEnabled: state.statTrackingEnabled,
          events: state.events,
          currentPoint: state.currentPoint,
          possession: state.possession,
          startingPossession: state.startingPossession,
          savedGames: state.savedGames,
          savedTeams: state.savedTeams,
          pointTimerEnabled: state.pointTimerEnabled,
          currentPointStartTime: state.currentPointStartTime,
          pointStartTimestamps: state.pointStartTimestamps,
          pointTimerPausedElapsed: state.pointTimerPausedElapsed,
          // Timeout state
          pendingTimeoutModal: state.pendingTimeoutModal,
          timeoutEndTime: state.timeoutEndTime,
          timeoutTimeLeft: state.timeoutTimeLeft,
          // Line calling state
          currentLine: state.currentLine,
          pointLines: state.pointLines,
        }),
      },
    ),
  ),
);
