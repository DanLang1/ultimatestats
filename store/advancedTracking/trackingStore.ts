import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  assertTwoSides,
  assertValidInjurySubInput,
  assertValidLines,
  assertValidParticipantRefs,
  assertValidSideIds,
  canStartSecondHalfEarly,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getOtherSideId,
  getReceivingSideForNextPoint,
  hasPointEnded,
  isAdvancedGameOver,
  isPossessionOver,
  syncCapTransitions,
  syncDerivedHalftimeTransition,
} from '@/lib/advancedTracking/trackingUtils';
import { useSettingsStore } from '@/store/settingsStore';
import {
  getActiveGameClockPause,
  getGameClockElapsedMs,
  getPointAdjustedTimestamp,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';
import {
  getAdjustedHalftimeTimerDuration,
  getDefaultHalftimeTimerState,
} from '@/lib/advancedTracking/halftimeTimerUtils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { generateId } from '@/lib/utils';
import { Draft } from 'immer';
import {
  AdvancedTrackingState,
  AdvancedTrackingUndoEntry,
  CorrectPointLineInput,
  RecordStoppageInput,
  RecordSubInput,
  UpdateSubInput,
} from './trackingStore.types';

const ADVANCED_TRACKING_STORAGE_KEY = 'ultimatestats_advanced_tracking';

type GameLookupState = { currentGameId: string | null; currentGame: AdvancedTrackedGame | null };

function getCurrentGame(state: GameLookupState): AdvancedTrackedGame {
  if (state.currentGameId == null) throw new Error('No active game.');
  if (state.currentGame == null || state.currentGame.id !== state.currentGameId) {
    throw new Error(`currentGameId "${state.currentGameId}" not loaded.`);
  }
  return state.currentGame;
}

function pushUndoEntry(state: Draft<AdvancedTrackingState>, entry: AdvancedTrackingUndoEntry) {
  state.undoStack.push(entry);
}

function resetHalftimeTimerState(state: Draft<AdvancedTrackingState>) {
  Object.assign(state, getDefaultHalftimeTimerState());
}

function setHalftimeBreakActive(state: Draft<AdvancedTrackingState>, isActive: boolean) {
  if (isActive) {
    if (!state.isHalftimeBreakActive) {
      resetHalftimeTimerState(state);
    }
    state.isHalftimeBreakActive = true;
    return;
  }

  state.isHalftimeBreakActive = false;
  resetHalftimeTimerState(state);
}

function removeActionById(
  game: AdvancedTrackedGame,
  pointId: string,
  possessionId: string,
  actionId: string,
) {
  const point = game.points.find((candidate) => candidate.id === pointId);
  if (point == null) return;

  const possession = point.possessions.find((candidate) => candidate.id === possessionId);
  if (possession == null) return;

  const actionIndex = possession.actions.findIndex((candidate) => candidate.id === actionId);
  if (actionIndex === -1) return;

  const [removedAction] = possession.actions.splice(actionIndex, 1);

  if (removedAction?.kind === 'stoppage' && point.subs != null) {
    point.subs = point.subs.filter((sub) => sub.stoppageActionId !== removedAction.id);
    if (point.subs.length === 0) {
      point.subs = undefined;
    }
  }

  if (possession.actions.length === 0) {
    if (point.possessions.length > 1) {
      point.possessions = point.possessions.filter((candidate) => candidate.id !== possessionId);
    } else {
      game.points = game.points.filter((candidate) => candidate.id !== pointId);
    }
  }
}

export const useAdvancedTrackingStore = create<AdvancedTrackingState>()(
  immer(
    persist(
      (set, get) => ({
        currentGameId: null,
        currentGame: null,
        undoStack: [],
        isHalftimeBreakActive: false,
        ...getDefaultHalftimeTimerState(),

        loadCurrentGame: async () => {
          const currentGameId = get().currentGameId;
          if (currentGameId == null) return null;
          const game = await useSavedAdvancedGamesStore.getState().loadGame(currentGameId);
          set((state) => {
            if (state.currentGameId !== currentGameId) return;
            state.currentGame = game;
          });
          return game;
        },

        clearHalftimeBreak: () => {
          set((state) => {
            setHalftimeBreakActive(state, false);
          });
        },

        startHalftimeTimer: () => {
          set((state) => {
            if (!state.isHalftimeBreakActive || state.halftimeTimerStartedAt != null) return;
            state.halftimeTimerStartedAt = Date.now();
          });
        },

        pauseHalftimeTimer: (timeLeftSeconds) => {
          set((state) => {
            if (!state.isHalftimeBreakActive) return;
            state.halftimeTimerDurationSeconds = timeLeftSeconds;
            state.halftimeTimerStartedAt = null;
          });
        },

        adjustHalftimeTimer: (timeLeftSeconds, deltaMinutes) => {
          set((state) => {
            if (!state.isHalftimeBreakActive) return;
            state.halftimeTimerDurationSeconds = getAdjustedHalftimeTimerDuration(
              timeLeftSeconds,
              deltaMinutes,
            );
            if (state.halftimeTimerStartedAt != null) {
              state.halftimeTimerStartedAt = Date.now();
            }
          });
        },

        resetHalftimeTimer: () => {
          set((state) => {
            resetHalftimeTimerState(state);
          });
        },

        createGame: (input) => {
          const now = Date.now();

          assertTwoSides(input.sides);

          const sideIds = input.sides.map((side) => side.id);
          if (!sideIds.includes(input.focusSideId)) {
            throw new Error('focusSideId must match one of the advanced tracking sides.');
          }
          if (!sideIds.includes(input.initialReceivingSideId)) {
            throw new Error(
              'initialReceivingSideId must match one of the advanced tracking sides.',
            );
          }

          const gameId = input.id ?? generateId();
          const game: AdvancedTrackedGame = {
            id: gameId,
            schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now,
            gameType: input.gameType ?? 'game',
            status: 'in_progress',
            focusSideId: input.focusSideId,
            initialReceivingSideId: input.initialReceivingSideId,
            metadata: input.metadata,
            settings: {
              locationMode: 'none',
              format: {
                formatType: 'standard',
                gameTo: input.format.gameTo,
                halftimeAt:
                  (input.format.halftimeEnabled ?? true)
                    ? Math.ceil(input.format.gameTo / 2)
                    : undefined,
                softCapAt: input.format.softCapAt,
                hardCapAt: input.format.hardCapAt,
                timeoutsPerHalf: input.format.timeoutsPerHalf,
                floaterEnabled: input.format.floaterEnabled,
              },
            },
            sides: input.sides,
            participants: input.participants,
            points: [],
          };

          set((state) => {
            state.currentGame = game;
            state.currentGameId = gameId;
            state.undoStack = [];
            setHalftimeBreakActive(state, false);
          });

          return gameId;
        },

        resetCurrentGame: () => {
          const gameId = get().currentGameId;
          set((state) => {
            state.currentGame = null;
            state.currentGameId = null;
            state.undoStack = [];
            setHalftimeBreakActive(state, false);
          });
          if (gameId != null) {
            void useSavedAdvancedGamesStore.getState().deleteGame(gameId);
          }
        },

        finalizeGame: async () => {
          const now = Date.now();
          const game = getCurrentGame(get());
          if (!isAdvancedGameOver(game)) {
            const score = getGameScore(game);
            const effectiveGameTo = getEffectiveGameTo(game);
            throw new Error(
              `Cannot finalize game before it is over. Score is ${score[game.sides[0].id]}-${score[game.sides[1].id]} with target ${effectiveGameTo}. Use terminateGame(...) to end early.`,
            );
          }
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.status = 'final';
            liveGame.updatedAt = now;
          });
          const gameToPersist = get().currentGame;
          if (gameToPersist != null) {
            await useSavedAdvancedGamesStore.getState().saveGame(gameToPersist);
          }
          set((state) => {
            state.currentGameId = null;
            state.undoStack = [];
            setHalftimeBreakActive(state, false);
          });
        },

        terminateGame: (endReason) => {
          const now = Date.now();
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.status = 'terminated';
            liveGame.endReason = endReason;
            liveGame.updatedAt = now;
          });
        },

        finishTerminatedGame: async () => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.status !== 'terminated') {
              throw new Error('Cannot finish a game that has not been terminated.');
            }
          });
          const gameToPersist = get().currentGame;
          if (gameToPersist != null) {
            await useSavedAdvancedGamesStore.getState().saveGame(gameToPersist);
          }
          set((state) => {
            state.currentGameId = null;
            state.undoStack = [];
            setHalftimeBreakActive(state, false);
          });
        },

        updateGameMetadata: (metadata) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.metadata = metadata;
            liveGame.updatedAt = Date.now();
          });
        },

        startGameClockPause: (reason) => {
          const game = getCurrentGame(get());
          if (game.points[0]?.startedAt == null) {
            throw new Error('Cannot pause the game clock before the game has started.');
          }
          if (getActiveGameClockPause(game) != null) {
            throw new Error('Game clock is already paused.');
          }

          const pauseId = generateId();
          const point = getCurrentPoint(game);
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.gameClockPauses == null) {
              liveGame.gameClockPauses = [];
            }
            liveGame.gameClockPauses.push({
              id: pauseId,
              reason,
              pausedAt: now,
              pointId: point != null && !hasPointEnded(point) ? point.id : undefined,
            });
            liveGame.updatedAt = now;
          });

          return pauseId;
        },

        resumeGameClockPause: (pauseId) => {
          const game = getCurrentGame(get());
          const activePause = getActiveGameClockPause(game);
          if (activePause?.id !== pauseId) {
            throw new Error(`Game clock pause "${pauseId}" is not active.`);
          }

          const now = Date.now();
          set((state) => {
            const liveGame = getCurrentGame(state);
            const pause = liveGame.gameClockPauses?.find((candidate) => candidate.id === pauseId);
            if (pause == null || pause.resumedAt != null) return;
            pause.resumedAt = now;
            liveGame.updatedAt = now;
          });
        },

        recordGameTransition: (transitionType) => {
          const game = getCurrentGame(get());
          const currentPoint = getCurrentPoint(game);

          if (transitionType === 'soft_cap' && currentPoint == null) {
            throw new Error('Cannot record soft_cap before the first point is completed.');
          }
          if (transitionType === 'soft_cap' && !hasPointEnded(currentPoint)) {
            throw new Error('Cannot record soft_cap while a point is in progress.');
          }
          if (
            transitionType === 'soft_cap' &&
            game.gameTransitions?.some((t) => t.transitionType === 'soft_cap')
          ) {
            throw new Error('soft_cap has already been recorded.');
          }
          if (
            transitionType === 'hard_cap' &&
            game.gameTransitions?.some((t) => t.transitionType === 'hard_cap')
          ) {
            throw new Error('hard_cap has already been recorded.');
          }

          const transitionId = generateId();
          const afterPointId = currentPoint?.id;

          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.gameTransitions == null) {
              liveGame.gameTransitions = [];
            }
            if (transitionType === 'soft_cap') {
              liveGame.gameTransitions.push({
                id: transitionId,
                transitionType: 'soft_cap',
                afterPointId: afterPointId!,
              });
            } else {
              liveGame.gameTransitions.push({
                id: transitionId,
                transitionType: 'hard_cap',
                afterPointId,
              });
            }
            liveGame.updatedAt = Date.now();
          });
        },

        triggerHalftimeEarly: () => {
          if (get().currentGameId == null) {
            return false;
          }

          const game = getCurrentGame(get());
          const currentPoint = getCurrentPoint(game);
          const lastUndoEntry = get().undoStack.at(-1);

          if (!canStartSecondHalfEarly(game, lastUndoEntry)) {
            return false;
          }

          const currentPointId = currentPoint!.id;
          const transitionId = generateId();
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.gameTransitions == null) {
              liveGame.gameTransitions = [];
            }
            liveGame.gameTransitions.push({
              id: transitionId,
              transitionType: 'halftime',
              afterPointId: currentPointId,
              triggeredEarly: true,
            });
            pushUndoEntry(state, {
              kind: 'halftime_early',
              pointId: currentPointId,
              transitionId,
            });
            liveGame.updatedAt = now;
            setHalftimeBreakActive(state, true);
          });

          return true;
        },

        recordBetweenPointTimeout: (input) => {
          const game = getCurrentGame(get());
          const currentPoint = getCurrentPoint(game);
          if (currentPoint == null || !hasPointEnded(currentPoint)) {
            throw new Error('Cannot record a between-point timeout before a point has ended.');
          }

          assertValidSideIds(game, [input.sideId]);
          const transitionId = generateId();
          const pointId = currentPoint.id;
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            if (livePoint.transitionsAfter == null) {
              livePoint.transitionsAfter = [];
            }
            livePoint.transitionsAfter.push({
              id: transitionId,
              transitionType: 'timeout',
              sideId: input.sideId,
              ...(input.isFloater === true ? { isFloater: true } : {}),
              startedAt: now,
            });
            liveGame.updatedAt = now;
            pushUndoEntry(state, {
              kind: 'between_point_timeout',
              pointId,
              transitionId,
            });
          });

          return transitionId;
        },

        endBetweenPointTimeout: (transitionId) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            const currentPoint = getCurrentPoint(liveGame);
            const timeout = currentPoint?.transitionsAfter?.find(
              (transition) => transition.id === transitionId,
            );
            if (timeout == null || timeout.transitionType !== 'timeout') {
              return;
            }

            timeout.endedAt = Date.now();
            liveGame.updatedAt = Date.now();
          });
        },

        recordPull: (input) => {
          const game = getCurrentGame(get());
          assertValidLines(game, input.lines);
          assertValidParticipantRefs(game, [input.puller, input.receiver]);

          const currentPoint = getCurrentPoint(game);
          if (currentPoint != null && !hasPointEnded(currentPoint)) {
            throw new Error('Cannot record a pull while the current point is still in progress.');
          }

          const receivingSideId = getReceivingSideForNextPoint(game);
          const pullingSideId = getOtherSideId(game, receivingSideId);
          const pointId = generateId();
          const possessionId = generateId();
          const actionId = generateId();
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.points.push({
              id: pointId,
              lines: input.lines,
              genderRatio: input.genderRatio,
              startedAt: now,
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
                      recordedAt: now,
                    },
                  ],
                },
              ],
            });
            pushUndoEntry(state, {
              kind: 'action',
              pointId,
              possessionId,
              actionId,
            });
            liveGame.updatedAt = now;
          });

          return actionId;
        },

        amendOpeningPullAsDropped: (receiver) => {
          const game = getCurrentGame(get());
          assertValidParticipantRefs(game, [receiver]);

          const currentPoint = getCurrentPoint(game);
          const currentPossession = getCurrentPossession(game);
          const openingAction = currentPossession?.actions[0];
          if (currentPoint == null || currentPossession == null || openingAction?.kind !== 'pull') {
            throw new Error('Cannot mark a dropped pull before a pull has been recorded.');
          }
          if (currentPossession.actions.length !== 1 || hasPointEnded(currentPoint)) {
            throw new Error('Cannot mark a dropped pull after the point has advanced.');
          }

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            const livePossession = getCurrentPossession(liveGame)!;
            const liveOpeningAction = livePossession.actions[0];
            if (liveOpeningAction.kind !== 'pull') return;

            const previousResult = liveOpeningAction.result;
            const previousReceiver = liveOpeningAction.receiver;
            liveOpeningAction.result = 'dropped';
            liveOpeningAction.receiver = receiver;
            pushUndoEntry(state, {
              kind: 'amend_pull_result',
              pointId: livePoint.id,
              possessionId: livePossession.id,
              actionId: liveOpeningAction.id,
              previousResult,
              previousReceiver,
            });
            liveGame.updatedAt = Date.now();
          });
        },

        recordPickup: (input) => {
          const game = getCurrentGame(get());
          assertValidSideIds(game, [input.sideId]);
          assertValidParticipantRefs(game, [input.player]);

          const currentPossession = getCurrentPossession(game);
          if (currentPossession == null) {
            throw new Error('Cannot record a pickup before a point has started.');
          }
          if (hasPointEnded(getCurrentPoint(game))) {
            throw new Error('Cannot record a pickup after the point has ended.');
          }

          const nextPossessionSideId = isPossessionOver(currentPossession)
            ? getOtherSideId(game, currentPossession.sideId)
            : currentPossession.sideId;

          if (input.sideId !== nextPossessionSideId) {
            throw new Error(`Expected pickup for side "${nextPossessionSideId}".`);
          }

          const actionId = generateId();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const point = getCurrentPoint(liveGame)!;
            let possession = getCurrentPossession(liveGame)!;

            if (isPossessionOver(possession)) {
              possession = { id: generateId(), sideId: input.sideId, actions: [] };
              point.possessions.push(possession);
            }

            possession.actions.push({
              id: actionId,
              kind: 'disc_pickup',
              sideId: input.sideId,
              player: input.player,
              recordedAt: Date.now(),
            });
            pushUndoEntry(state, {
              kind: 'action',
              pointId: point.id,
              possessionId: possession.id,
              actionId,
            });

            liveGame.updatedAt = Date.now();
          });

          return actionId;
        },

        recordThrow: (input) => {
          const game = getCurrentGame(get());
          assertValidParticipantRefs(game, [input.thrower, input.toPlayer, input.defender]);

          const currentPossession = getCurrentPossession(game);
          if (currentPossession == null) {
            throw new Error('Cannot record a throw before a point has started.');
          }
          if (hasPointEnded(getCurrentPoint(game))) {
            throw new Error('Cannot record a throw after the point has ended.');
          }
          if (isPossessionOver(currentPossession)) {
            throw new Error('Cannot record a throw after the possession has already ended.');
          }

          const actionId = generateId();
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const possession = getCurrentPossession(liveGame)!;
            const livePoint = getCurrentPoint(liveGame)!;
            possession.actions.push({
              id: actionId,
              kind: 'throw',
              sideId: possession.sideId,
              thrower: input.thrower,
              result: input.result,
              toPlayer: input.toPlayer,
              defender: input.defender,
              splitAttribution: input.splitAttribution,
              recordedAt: now,
            });
            if (input.result === 'goal' || input.result === 'callahan') {
              livePoint.elapsedMsAtEnd =
                input.timerElapsedMs ?? now - getPointAdjustedTimestamp(livePoint, liveGame);
              livePoint.revivedAt = undefined;
            }
            pushUndoEntry(state, {
              kind: 'action',
              pointId: livePoint.id,
              possessionId: possession.id,
              actionId,
            });
            if (input.result === 'goal' || input.result === 'callahan') {
              const gameStartedAt = liveGame.points[0]?.startedAt;
              if (gameStartedAt != null) {
                const { hardCapMins, softCapMins } = useSettingsStore.getState();
                syncCapTransitions(liveGame, {
                  gameElapsedMs: getGameClockElapsedMs(liveGame, now),
                  gameLengthMinutes: hardCapMins,
                  softCapMins,
                });
              }
            }
            if (syncDerivedHalftimeTransition(liveGame)) {
              setHalftimeBreakActive(state, true);
            }
            liveGame.updatedAt = now;
          });

          return actionId;
        },

        amendLastThrowAsGoal: (timerElapsedMs?: number) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          const possession = getCurrentPossession(game);
          if (!point || !possession) return;

          let lastThrow: { id: string; result: string } | null = null;
          for (let i = possession.actions.length - 1; i >= 0; i--) {
            const a = possession.actions[i];
            if (a.kind === 'throw') {
              lastThrow = a;
              break;
            }
          }
          if (!lastThrow || lastThrow.result !== 'complete') return;

          const actionId = lastThrow.id;
          const previousResult = lastThrow.result;

          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = liveGame.points.find((p) => p.id === point.id);
            const livePossession = livePoint?.possessions.find((p) => p.id === possession.id);
            const action = livePossession?.actions.find((a) => a.id === actionId);
            if (action?.kind === 'throw') {
              action.result = 'goal';
            }
            if (livePoint) {
              const goalTime = action?.kind === 'throw' ? (action.recordedAt ?? now) : now;
              livePoint.elapsedMsAtEnd =
                timerElapsedMs ?? goalTime - getPointAdjustedTimestamp(livePoint, liveGame);
              livePoint.revivedAt = undefined;
            }
            // The goal is one atomic operation from the coach's perspective.
            // Pop the action undo entry that recordThrow just pushed so a
            // single undo removes the entire throw, not just the goal marker.
            const topEntry = state.undoStack.at(-1);
            if (topEntry?.kind === 'action' && topEntry.actionId === actionId) {
              state.undoStack.pop();
            }
            pushUndoEntry(state, {
              kind: 'amend_throw_result',
              pointId: point.id,
              possessionId: possession.id,
              actionId,
              previousResult,
            });
            const gameStartedAt = liveGame.points[0]?.startedAt;
            if (gameStartedAt != null) {
              const { hardCapMins, softCapMins } = useSettingsStore.getState();
              syncCapTransitions(liveGame, {
                gameElapsedMs: getGameClockElapsedMs(liveGame, now),
                gameLengthMinutes: hardCapMins,
                softCapMins,
              });
            }
            if (syncDerivedHalftimeTransition(liveGame)) {
              setHalftimeBreakActive(state, true);
            }
            liveGame.updatedAt = now;
          });
        },

        recordStoppage: (input: RecordStoppageInput) => {
          const game = getCurrentGame(get());
          const currentPoint = getCurrentPoint(game);
          if (currentPoint == null) {
            throw new Error('Cannot record a stoppage before a point has started.');
          }
          if (hasPointEnded(currentPoint)) {
            throw new Error('Cannot record a stoppage after the point has ended.');
          }
          if (input.sideId != null) {
            assertValidSideIds(game, [input.sideId]);
          }

          const actionId = generateId();
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const possession = getCurrentPossession(liveGame)!;
            possession.actions.push({
              id: actionId,
              kind: 'stoppage',
              reason: input.reason,
              sideId: input.sideId,
              isFloater: input.reason === 'timeout' ? input.isFloater : undefined,
              recordedAt: now,
              pausedAt: now,
            });
            liveGame.updatedAt = now;
          });

          return actionId;
        },

        resumeStoppage: (actionId: string) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          const possession = getCurrentPossession(game);
          const last = possession?.actions[possession.actions.length - 1];
          if (!last || last.kind !== 'stoppage' || last.id !== actionId) {
            throw new Error(`Stoppage action "${actionId}" not found as last action.`);
          }
          if (last.resumedAt != null) {
            throw new Error('Stoppage has already been resumed.');
          }

          const now = Date.now();
          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePossession = getCurrentPossession(liveGame)!;
            const action = livePossession.actions[livePossession.actions.length - 1];
            if (action?.kind === 'stoppage') {
              action.resumedAt = now;
            }
            liveGame.updatedAt = now;
          });
        },

        cancelStoppage: (actionId: string) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          const possession = getCurrentPossession(game);
          const last = possession?.actions[possession.actions.length - 1];
          if (!last || last.kind !== 'stoppage' || last.id !== actionId) {
            throw new Error(`Stoppage action "${actionId}" not found as last action.`);
          }
          if (last.resumedAt != null) {
            throw new Error('Cannot cancel a stoppage after it has resumed.');
          }

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            const livePossession = getCurrentPossession(liveGame)!;
            removeActionById(liveGame, livePoint.id, livePossession.id, actionId);
            liveGame.updatedAt = Date.now();
          });
        },

        recordSub: (input: RecordSubInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          assertValidInjurySubInput(game, point, input);
          if (point.subs?.some((sub) => sub.stoppageActionId === input.stoppageActionId)) {
            throw new Error(`Sub already recorded for stoppage "${input.stoppageActionId}".`);
          }

          const subId = generateId();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            if (livePoint.subs == null) {
              livePoint.subs = [];
            }
            livePoint.subs.push({
              id: subId,
              sideId: input.sideId,
              type: 'injury',
              inIds: input.inIds,
              outIds: input.outIds,
              stoppageActionId: input.stoppageActionId,
            });
            liveGame.updatedAt = Date.now();
          });
        },

        updateSub: (input: UpdateSubInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          assertValidInjurySubInput(game, point, input);

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            const sub = livePoint.subs?.find(
              (item) => item.stoppageActionId === input.stoppageActionId,
            );
            if (sub == null) {
              throw new Error(`Sub for stoppage "${input.stoppageActionId}" not found.`);
            }
            sub.sideId = input.sideId;
            sub.inIds = input.inIds;
            sub.outIds = input.outIds;
            liveGame.updatedAt = Date.now();
          });
        },

        correctPointLine: (input: CorrectPointLineInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');
          if (hasPointEnded(point)) {
            throw new Error('Cannot edit line after the point has ended.');
          }

          assertValidSideIds(game, [input.sideId]);
          assertValidLines(game, [{ sideId: input.sideId, participantIds: input.participantIds }]);

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;

            if (!livePoint.lines.some((l) => l.sideId === input.sideId)) {
              throw new Error('Cannot edit a line that has not been set yet.');
            }

            livePoint.lines = livePoint.lines.filter((l) => l.sideId !== input.sideId);
            livePoint.lines.push({
              sideId: input.sideId,
              participantIds: input.participantIds,
            });

            if (livePoint.subs != null) {
              livePoint.subs = livePoint.subs.filter((sub) => sub.sideId !== input.sideId);
              if (livePoint.subs.length === 0) {
                livePoint.subs = undefined;
              }
            }

            liveGame.updatedAt = Date.now();
          });
        },

        undoLastOperation: () => {
          if (get().currentGameId == null) {
            return false;
          }

          const lastUndoEntry = get().undoStack.at(-1);
          if (lastUndoEntry == null) {
            return false;
          }

          set((state) => {
            const liveGame = getCurrentGame(state);

            if (lastUndoEntry.kind === 'action') {
              const undoPoint = liveGame.points.find((p) => p.id === lastUndoEntry.pointId);
              const undoPossession = undoPoint?.possessions.find(
                (p) => p.id === lastUndoEntry.possessionId,
              );
              const undoAction = undoPossession?.actions.find(
                (a) => a.id === lastUndoEntry.actionId,
              );
              if (
                undoAction?.kind === 'throw' &&
                (undoAction.result === 'goal' || undoAction.result === 'callahan') &&
                undoPoint != null
              ) {
                undoPoint.revivedAt = Date.now();
              }
              removeActionById(
                liveGame,
                lastUndoEntry.pointId,
                lastUndoEntry.possessionId,
                lastUndoEntry.actionId,
              );
            } else if (lastUndoEntry.kind === 'between_point_timeout') {
              const point = liveGame.points.find(
                (candidate) => candidate.id === lastUndoEntry.pointId,
              );
              if (point?.transitionsAfter != null) {
                point.transitionsAfter = point.transitionsAfter.filter(
                  (transition) => transition.id !== lastUndoEntry.transitionId,
                );
                if (point.transitionsAfter.length === 0) {
                  point.transitionsAfter = undefined;
                }
              }
            } else if (lastUndoEntry.kind === 'halftime_early') {
              liveGame.gameTransitions = liveGame.gameTransitions?.filter(
                (transition) => transition.id !== lastUndoEntry.transitionId,
              );
              if (liveGame.gameTransitions?.length === 0) {
                liveGame.gameTransitions = undefined;
              }
            } else if (lastUndoEntry.kind === 'amend_throw_result') {
              const point = liveGame.points.find(
                (candidate) => candidate.id === lastUndoEntry.pointId,
              );
              const possession = point?.possessions.find(
                (candidate) => candidate.id === lastUndoEntry.possessionId,
              );
              const action = possession?.actions.find(
                (candidate) => candidate.id === lastUndoEntry.actionId,
              );
              if (action?.kind === 'throw') {
                const wasGoal = action.result === 'goal' || action.result === 'callahan';
                removeActionById(
                  liveGame,
                  lastUndoEntry.pointId,
                  lastUndoEntry.possessionId,
                  lastUndoEntry.actionId,
                );
                if (wasGoal && point != null) {
                  point.revivedAt = Date.now();
                }
              }
            } else if (lastUndoEntry.kind === 'amend_pull_result') {
              const point = liveGame.points.find(
                (candidate) => candidate.id === lastUndoEntry.pointId,
              );
              const possession = point?.possessions.find(
                (candidate) => candidate.id === lastUndoEntry.possessionId,
              );
              const action = possession?.actions.find(
                (candidate) => candidate.id === lastUndoEntry.actionId,
              );
              if (action?.kind === 'pull') {
                action.result = lastUndoEntry.previousResult;
                action.receiver = lastUndoEntry.previousReceiver;
              }
            }

            state.undoStack.pop();
            setHalftimeBreakActive(state, syncDerivedHalftimeTransition(liveGame));
            liveGame.updatedAt = Date.now();
          });

          return true;
        },

        importAdvancedGame: async (game) => {
          await useSavedAdvancedGamesStore.getState().saveGame(game);
          set((state) => {
            if (state.currentGameId === game.id) {
              state.currentGame = game;
            }
          });
        },

        deleteSavedGame: async (gameId) => {
          await useSavedAdvancedGamesStore.getState().deleteGame(gameId);
          set((state) => {
            if (state.currentGameId === gameId) {
              state.currentGameId = null;
              state.currentGame = null;
              state.undoStack = [];
              setHalftimeBreakActive(state, false);
            }
          });
        },
      }),
      {
        name: ADVANCED_TRACKING_STORAGE_KEY,
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          if (state?.currentGameId != null) {
            void state.loadCurrentGame();
          }
        },
        partialize: (state) => ({
          currentGameId: state.currentGameId,
          undoStack: state.undoStack,
          isHalftimeBreakActive: state.isHalftimeBreakActive,
          halftimeTimerStartedAt: state.halftimeTimerStartedAt,
          halftimeTimerDurationSeconds: state.halftimeTimerDurationSeconds,
        }),
      },
    ),
  ),
);

let lastPersistedGameStamp: string | null = null;

useAdvancedTrackingStore.subscribe((state) => {
  const game = state.currentGame;
  if (game == null) {
    return;
  }
  const nextStamp = `${game.id}:${game.updatedAt}`;
  if (nextStamp === lastPersistedGameStamp) {
    return;
  }
  lastPersistedGameStamp = nextStamp;
  void useSavedAdvancedGamesStore.getState().saveGame(game);
});
