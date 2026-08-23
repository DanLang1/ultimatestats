import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draft } from 'immer';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  correctAdvancedGoalScorer,
  type CorrectAdvancedGoalScorerInput,
} from '@/lib/advancedTracking/advancedActionCorrectionUtils';
import {
  correctAdvancedPointLines,
  type CorrectAdvancedPointLinesInput,
} from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import { planCaptureIntent } from '@/lib/advancedTracking/captureIntentUtils';
import { withAdvancedGameNote } from '@/lib/advancedTracking/gameNoteUtils';
import {
  getAdjustedHalftimeTimerDuration,
  getDefaultHalftimeTimerState,
} from '@/lib/advancedTracking/halftimeTimerUtils';
import {
  replaceSubsForStoppage,
  withAppendedStoppage,
} from '@/lib/advancedTracking/injurySubUtils';
import { deriveRosterParticipantSyncPlan } from '@/lib/advancedTracking/participantSync';
import {
  getActiveGameClockPause,
  getGameClockElapsedMs,
  getPointAdjustedTimestamp,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import type { AdvancedGameLookupState } from '@/lib/advancedTracking/trackingUtils';
import {
  assertTwoSides,
  assertValidInjurySubInput,
  assertValidLines,
  assertValidParticipantRefs,
  assertValidPointLineHistory,
  assertValidSideIds,
  canStartSecondHalfEarly,
  getActiveAdvancedGame,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getLiveInProgressGame,
  getOtherSideId,
  getReceivingSideForNextPoint,
  hasInjurySubChanges,
  hasPointEnded,
  isAdvancedGameOver,
  isPossessionOver,
  syncCapTransitions,
  syncDerivedHalftimeTransition,
} from '@/lib/advancedTracking/trackingUtils';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  AdvancedTrackedGame,
  StoppageAction,
  getEligibleThrowTypes,
} from '@/lib/advancedTracking/types';
import { generateId } from '@/lib/utils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { registerActiveAdvancedGameGetter, useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

import { getCurrentPendingNextPointLineSelection } from './pendingLineSelection';
import {
  AdvancedTrackingState,
  AdvancedTrackingUndoEntry,
  CorrectPointLinesInput,
  RecordInjurySubsInput,
  RecordStoppageInput,
  UpdateInjurySubsInput,
  UpdateThrowTypeInput,
} from './trackingStore.types';

const ADVANCED_TRACKING_STORAGE_KEY = 'ultimatestats_advanced_tracking';

function getCurrentGame(state: AdvancedGameLookupState): AdvancedTrackedGame {
  if (state.currentGameId == null) throw new Error('No active game.');
  const game = getActiveAdvancedGame(state);
  if (game == null) {
    throw new Error(`currentGameId "${state.currentGameId}" not loaded.`);
  }
  return game;
}

function pushUndoEntry(state: Draft<AdvancedTrackingState>, entry: AdvancedTrackingUndoEntry) {
  state.undoStack.push(entry);
}

function resetHalftimeTimerState(state: Draft<AdvancedTrackingState>) {
  Object.assign(state, getDefaultHalftimeTimerState());
}

function clearPendingNextPointLineSelection(state: Draft<AdvancedTrackingState>) {
  state.pendingNextPointLineSelection = null;
}

function reconcilePendingNextPointLineSelection(state: Draft<AdvancedTrackingState>) {
  const selection = state.pendingNextPointLineSelection;
  const game = state.currentGame;
  if (
    selection != null &&
    game != null &&
    getCurrentPendingNextPointLineSelection(game, selection) == null
  ) {
    clearPendingNextPointLineSelection(state);
  }
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
        pendingNextPointLineSelection: null,
        isHalftimeBreakActive: false,
        ...getDefaultHalftimeTimerState(),

        loadCurrentGame: async () => {
          const currentGameId = get().currentGameId;
          if (currentGameId == null) return null;
          const game = await useSavedAdvancedGamesStore.getState().loadGame(currentGameId);
          set((state) => {
            if (state.currentGameId !== currentGameId) return;
            state.currentGame = game;
            reconcilePendingNextPointLineSelection(state);
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

        savePendingNextPointLineSelection: (sideId, participantIds) => {
          const game = getCurrentGame(get());
          const currentPoint = getCurrentPoint(game);
          if (currentPoint != null && !hasPointEnded(currentPoint)) {
            throw new Error('Cannot prepare the next line while the current point is in progress.');
          }

          assertValidSideIds(game, [sideId]);
          const validParticipantIds = new Set(
            game.participants.map((participant) => participant.id),
          );
          for (const participantId of participantIds) {
            if (!validParticipantIds.has(participantId)) {
              throw new Error(
                `Unknown participantId "${participantId}" while preparing the next line.`,
              );
            }
          }
          if (new Set(participantIds).size !== participantIds.length) {
            throw new Error(`A participant cannot appear more than once on side "${sideId}".`);
          }

          set((state) => {
            const liveGame = getCurrentGame(state);
            const afterPointId = getCurrentPoint(liveGame)?.id ?? null;
            const selection = state.pendingNextPointLineSelection;
            if (
              selection == null ||
              selection.gameId !== liveGame.id ||
              selection.afterPointId !== afterPointId
            ) {
              state.pendingNextPointLineSelection = {
                gameId: liveGame.id,
                afterPointId,
                participantIdsBySide: {},
              };
            }

            state.pendingNextPointLineSelection!.participantIdsBySide[sideId] = [...participantIds];
          });
        },

        clearPendingNextPointLineSelection: () => {
          set((state) => {
            clearPendingNextPointLineSelection(state);
          });
        },

        createGame: (input) => {
          const now = Date.now();

          assertTwoSides(input.sides);

          const sideIds = new Set(input.sides.map((side) => side.id));
          if (!sideIds.has(input.focusSideId)) {
            throw new Error('focusSideId must match one of the advanced tracking sides.');
          }
          if (!sideIds.has(input.initialReceivingSideId)) {
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
            ...(input.flip != null ? { flip: input.flip } : {}),
            metadata: withAdvancedGameNote(input.metadata, input.metadata?.notes),
            settings: {
              locationMode: 'none',
              format: {
                formatType: 'standard',
                gameTo: input.format.gameTo,
                halftimeAt:
                  (input.format.halftimeEnabled ?? true)
                    ? Math.ceil(input.format.gameTo / 2)
                    : undefined,
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

          set((state) => {
            state.currentGame = game;
            state.currentGameId = gameId;
            state.undoStack = [];
            clearPendingNextPointLineSelection(state);
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
            clearPendingNextPointLineSelection(state);
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
            clearPendingNextPointLineSelection(state);
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
            clearPendingNextPointLineSelection(state);
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
            clearPendingNextPointLineSelection(state);
            setHalftimeBreakActive(state, false);
          });
        },

        updateGameMetadata: (metadata) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.metadata = withAdvancedGameNote(metadata, metadata.notes);
            liveGame.updatedAt = Date.now();
          });
        },

        correctCurrentGoalScorer: async (input: CorrectAdvancedGoalScorerInput) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.status !== 'in_progress') {
              throw new Error('Only an in-progress game can be corrected through the live store.');
            }
            state.currentGame = correctAdvancedGoalScorer(liveGame, input);
          });

          const gameToPersist = get().currentGame;
          if (gameToPersist != null) {
            await persistLiveGame(gameToPersist);
          }
        },

        correctCurrentPointLines: async (input: CorrectAdvancedPointLinesInput) => {
          const game = getCurrentGame(get());
          if (game.status !== 'in_progress') {
            throw new Error('Only an in-progress game can be corrected through the live store.');
          }
          const point = game.points.find((candidate) => candidate.id === input.pointId);
          if (point == null) {
            throw new Error(
              `Point "${input.pointId}" was not found in advanced game "${game.id}".`,
            );
          }
          if (!hasPointEnded(point)) {
            throw new Error('Only a completed point can be corrected from the timeline.');
          }

          const correctedGame = correctAdvancedPointLines(game, input);
          set((state) => {
            state.currentGame = correctedGame;
          });

          const gameToPersist = get().currentGame;
          if (gameToPersist != null) {
            await persistLiveGame(gameToPersist);
          }
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

          if (transitionType === 'soft_cap' && game.settings.format?.softCapEnabled === false) {
            throw new Error('Cannot record soft_cap when soft cap tracking is disabled.');
          }
          if (transitionType === 'hard_cap' && game.settings.format?.hardCapEnabled === false) {
            throw new Error('Cannot record hard_cap when hard cap tracking is disabled.');
          }
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
            clearPendingNextPointLineSelection(state);
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

        recordCaptureIntent: (intent) => {
          const game = getCurrentGame(get());
          const planned = planCaptureIntent(game, intent);
          if (!planned.ok) return planned;
          if (planned.plan.pickup != null) {
            assertValidSideIds(game, [planned.plan.pickup.sideId]);
            assertValidParticipantRefs(game, [planned.plan.pickup.player]);
          }
          const throwInput = planned.plan.throw;
          if (throwInput != null) {
            assertValidParticipantRefs(game, [
              throwInput.thrower,
              throwInput.toPlayer,
              throwInput.defender,
            ]);
            if (
              throwInput.result === 'pressure' &&
              throwInput.defender?.refType !== 'participant'
            ) {
              throw new Error('Pressure requires a tracked defender.');
            }
          }
          const actionId = generateId();
          let visibleActionId = actionId;
          const now = Date.now();

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            let possession = getCurrentPossession(liveGame)!;
            if (planned.plan.pickup != null) {
              if (isPossessionOver(possession)) {
                possession = { id: generateId(), sideId: planned.plan.pickup.sideId, actions: [] };
                livePoint.possessions.push(possession);
              }
              const pickupId = generateId();
              visibleActionId = pickupId;
              possession.actions.push({
                id: pickupId,
                kind: 'disc_pickup',
                sideId: planned.plan.pickup.sideId,
                player: planned.plan.pickup.player,
                recordedAt: now,
              });
              pushUndoEntry(state, {
                kind: 'action',
                pointId: livePoint.id,
                possessionId: possession.id,
                actionId: pickupId,
              });
            }
            if (throwInput == null) {
              liveGame.updatedAt = now;
              return;
            }
            visibleActionId = actionId;
            possession.actions.push({
              id: actionId,
              kind: 'throw',
              sideId: possession.sideId,
              thrower: throwInput.thrower,
              result: throwInput.result,
              toPlayer: throwInput.toPlayer,
              defender: throwInput.defender,
              splitAttribution: throwInput.splitAttribution,
              recordedAt: now,
            });
            if (throwInput.result === 'goal' || throwInput.result === 'callahan') {
              livePoint.elapsedMsAtEnd = now - getPointAdjustedTimestamp(livePoint, liveGame);
              livePoint.revivedAt = undefined;
            }
            pushUndoEntry(state, {
              kind: 'action',
              pointId: livePoint.id,
              possessionId: possession.id,
              actionId,
            });
            if (throwInput.result === 'goal' || throwInput.result === 'callahan') {
              const gameStartedAt = liveGame.points[0]?.startedAt;
              if (gameStartedAt != null) {
                const { hardCapMins, advancedSoftCapAtMins } = useSettingsStore.getState();
                syncCapTransitions(liveGame, {
                  gameElapsedMs: getGameClockElapsedMs(liveGame, now),
                  capTiming: {
                    softCapAtMinutes: advancedSoftCapAtMins,
                    hardCapAtMinutes: hardCapMins,
                  },
                });
              }
            }
            if (syncDerivedHalftimeTransition(liveGame)) {
              setHalftimeBreakActive(state, true);
            }
            liveGame.updatedAt = now;
          });

          return { ok: true, actionId: visibleActionId };
        },

        updateThrowType: (input: UpdateThrowTypeInput) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = liveGame.points.find((candidate) => candidate.id === input.pointId);
            const livePossession = livePoint?.possessions.find(
              (candidate) => candidate.id === input.possessionId,
            );
            const liveAction = livePossession?.actions.find(
              (candidate) => candidate.id === input.actionId,
            );
            if (liveAction?.kind !== 'throw') {
              throw new Error(`Cannot update missing throw action "${input.actionId}".`);
            }
            const actionSide = liveGame.sides.find((side) => side.id === liveAction.sideId);
            if (actionSide?.trackingMode !== 'full-roster') {
              throw new Error('Throw details can only be added for fully tracked sides.');
            }

            if (input.type == null) {
              delete liveAction.details;
            } else if (!getEligibleThrowTypes(liveAction.result).includes(input.type)) {
              if (input.type === 'backfield_reset') {
                throw new Error('Backfield reset details require a turnover result.');
              }
              throw new Error(`Throw type "${input.type}" is not eligible for this result.`);
            } else {
              liveAction.details = { ...liveAction.details, type: input.type };
            }
            liveGame.updatedAt = Date.now();
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

        recordInjurySubs: (input: RecordInjurySubsInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          const possession = getCurrentPossession(game);
          if (point == null || possession == null) {
            throw new Error('Cannot record an injury substitution before a point has started.');
          }
          if (hasPointEnded(point)) {
            throw new Error('Cannot record an injury substitution after the point has ended.');
          }
          if (input.sideId != null) {
            assertValidSideIds(game, [input.sideId]);
          }
          if (!input.changes.some(hasInjurySubChanges)) {
            throw new Error('An injury substitution must change at least one lineup.');
          }

          const actionId = generateId();
          const now = Date.now();
          const stoppage: StoppageAction = {
            id: actionId,
            kind: 'stoppage',
            reason: 'injury',
            sideId: input.sideId,
            recordedAt: now,
            pausedAt: now,
          };
          const candidatePoint = withAppendedStoppage(point, possession.id, stoppage);
          candidatePoint.subs = replaceSubsForStoppage(candidatePoint, actionId, input.changes);
          assertValidPointLineHistory(game, candidatePoint);

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            const livePossession = getCurrentPossession(liveGame)!;
            livePossession.actions.push(stoppage);
            livePoint.subs = candidatePoint.subs;
            liveGame.updatedAt = now;
          });

          return actionId;
        },

        updateInjurySubs: (input: UpdateInjurySubsInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');
          if (hasPointEnded(point)) {
            throw new Error('Cannot update an injury substitution after the point has ended.');
          }

          const nextSubs = replaceSubsForStoppage(point, input.stoppageActionId, input.changes);
          const candidatePoint = { ...point, subs: nextSubs };
          for (const change of input.changes) {
            assertValidInjurySubInput(game, candidatePoint, {
              stoppageActionId: input.stoppageActionId,
              ...change,
            });
          }
          assertValidPointLineHistory(game, candidatePoint);

          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            livePoint.subs = nextSubs;
            liveGame.updatedAt = Date.now();
          });
        },

        correctPointLines: (input: CorrectPointLinesInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');
          if (hasPointEnded(point)) {
            throw new Error('Cannot edit line after the point has ended.');
          }

          const correctedGame = correctAdvancedPointLines(game, {
            pointId: point.id,
            lines: input.lines,
          });

          set((state) => {
            state.currentGame = correctedGame;
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
            reconcilePendingNextPointLineSelection(state);
            liveGame.updatedAt = Date.now();
          });

          return true;
        },

        importAdvancedGame: async (game) => {
          await useSavedAdvancedGamesStore.getState().saveGame(game);
          set((state) => {
            if (state.currentGameId === game.id) {
              state.currentGame = game;
              reconcilePendingNextPointLineSelection(state);
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
              clearPendingNextPointLineSelection(state);
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
          pendingNextPointLineSelection: state.pendingNextPointLineSelection,
          isHalftimeBreakActive: state.isHalftimeBreakActive,
          halftimeTimerStartedAt: state.halftimeTimerStartedAt,
          halftimeTimerDurationSeconds: state.halftimeTimerDurationSeconds,
        }),
      },
    ),
  ),
);

let lastPersistedLiveGame: AdvancedTrackedGame | null = null;
let lastLiveGamePersistPromise: Promise<void> | null = null;

function persistLiveGame(game: AdvancedTrackedGame): Promise<void> {
  if (game === lastPersistedLiveGame) {
    return lastLiveGamePersistPromise ?? Promise.resolve();
  }

  lastPersistedLiveGame = game;
  const persistPromise = useSavedAdvancedGamesStore
    .getState()
    .saveGame(game)
    .then(() => undefined);
  lastLiveGamePersistPromise = persistPromise;
  return persistPromise;
}

useAdvancedTrackingStore.subscribe((state) => {
  const game = state.currentGame;
  if (game == null) {
    return;
  }
  void persistLiveGame(game);
});

registerActiveAdvancedGameGetter(() => getLiveInProgressGame(useAdvancedTrackingStore.getState()));

useGameStore.subscribe((gameState) => {
  const game = getLiveInProgressGame(useAdvancedTrackingStore.getState());
  if (game == null) return;

  const plan = deriveRosterParticipantSyncPlan(game, gameState.currentTeam);
  if (plan == null) return;

  useAdvancedTrackingStore.setState((state) => {
    const liveGame = getCurrentGame(state);

    if (plan.participantsToAdd.length > 0) {
      liveGame.participants.push(...plan.participantsToAdd);
      liveGame.updatedAt = Date.now();
    }

    if (plan.unavailableParticipantIds.size > 0) {
      const selection = getCurrentPendingNextPointLineSelection(
        liveGame,
        state.pendingNextPointLineSelection,
      );
      if (selection != null) {
        for (const sideId of Object.keys(selection.participantIdsBySide)) {
          const draftedIds = selection.participantIdsBySide[sideId];
          const availableIds = draftedIds.filter(
            (participantId) => !plan.unavailableParticipantIds.has(participantId),
          );
          if (availableIds.length !== draftedIds.length) {
            selection.participantIdsBySide[sideId] = availableIds;
          }
        }
      }
    }
  });
});
