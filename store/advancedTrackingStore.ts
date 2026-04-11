import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  assertTwoSides,
  assertValidLines,
  assertValidParticipantRefs,
  assertValidSideIds,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getOtherSideId,
  getReceivingSideForNextPoint,
  hasPointEnded,
  isAdvancedGameOver,
  isPossessionOver,
  syncDerivedHalftimeTransition,
} from '@/lib/advancedTracking/trackingUtils';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';
import { generateId } from '@/lib/utils';
import { Draft } from 'immer';
import {
  AdvancedTrackingState,
  AdvancedTrackingUndoEntry,
  RecordStoppageInput,
  RecordSubInput,
} from './advancedTrackingStore.types';

const ADVANCED_TRACKING_STORAGE_KEY = 'ultimatestats_advanced_tracking';

type GameLookupState = { currentGameId: string | null; savedGames: AdvancedTrackedGame[] };

function getCurrentGame(state: GameLookupState): AdvancedTrackedGame {
  if (state.currentGameId == null) throw new Error('No active game.');
  const game = state.savedGames.find((g) => g.id === state.currentGameId);
  if (game == null)
    throw new Error(`currentGameId "${state.currentGameId}" not found in savedGames.`);
  return game;
}

function pushUndoEntry(state: Draft<AdvancedTrackingState>, entry: AdvancedTrackingUndoEntry) {
  state.undoStack.push(entry);
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
        savedGames: [],
        undoStack: [],

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

          const gameId = generateId();

          set((state) => {
            state.savedGames.push({
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
                  halftimeAt: Math.ceil(input.format.gameTo / 2),
                  softCapAt: input.format.softCapAt,
                  hardCapAt: input.format.hardCapAt,
                },
              },
              sides: input.sides,
              participants: input.participants,
              points: [],
            });
            state.currentGameId = gameId;
            state.undoStack = [];
          });

          return gameId;
        },

        resetCurrentGame: () => {
          set((state) => {
            state.savedGames = state.savedGames.filter((g) => g.id !== state.currentGameId);
            state.currentGameId = null;
            state.undoStack = [];
          });
        },

        finalizeGame: () => {
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
            state.currentGameId = null;
            state.undoStack = [];
          });
        },

        terminateGame: (endReason) => {
          const now = Date.now();
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.status = 'terminated';
            liveGame.endReason = endReason;
            liveGame.updatedAt = now;
            state.currentGameId = null;
            state.undoStack = [];
          });
        },

        updateGameMetadata: (metadata) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            liveGame.metadata = metadata;
            liveGame.updatedAt = Date.now();
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

          set((state) => {
            const liveGame = getCurrentGame(state);
            const possession = getCurrentPossession(liveGame)!;
            possession.actions.push({
              id: actionId,
              kind: 'throw',
              sideId: possession.sideId,
              thrower: input.thrower,
              result: input.result,
              toPlayer: input.toPlayer,
              defender: input.defender,
              splitAttribution: input.splitAttribution,
              recordedAt: Date.now(),
            });
            pushUndoEntry(state, {
              kind: 'action',
              pointId: getCurrentPoint(liveGame)!.id,
              possessionId: possession.id,
              actionId,
            });
            syncDerivedHalftimeTransition(liveGame);
            liveGame.updatedAt = Date.now();
          });

          return actionId;
        },

        recordStoppage: (input: RecordStoppageInput) => {
          // TODO: Support floating timeouts recorded outside an active point.
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
              recordedAt: now,
              pausedAt: now,
            });
            pushUndoEntry(state, {
              kind: 'action',
              pointId: currentPoint.id,
              possessionId: possession.id,
              actionId,
            });
            liveGame.updatedAt = now;
          });

          return actionId;
        },

        resumeStoppage: (actionId: string) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          let found = false;
          for (const possession of point.possessions) {
            for (const action of possession.actions) {
              if (action.id === actionId && action.kind === 'stoppage') {
                if (action.resumedAt != null) {
                  throw new Error('Stoppage has already been resumed.');
                }
                found = true;
              }
            }
          }
          if (!found) {
            throw new Error(`Stoppage action "${actionId}" not found in current point.`);
          }

          const now = Date.now();
          set((state) => {
            const liveGame = getCurrentGame(state);
            const livePoint = getCurrentPoint(liveGame)!;
            for (const possession of livePoint.possessions) {
              const action = possession.actions.find((a) => a.id === actionId);
              if (action?.kind === 'stoppage') {
                action.resumedAt = now;
              }
            }
            pushUndoEntry(state, {
              kind: 'resume_stoppage',
              pointId: livePoint.id,
              actionId,
            });
            liveGame.updatedAt = now;
          });
        },

        recordSub: (input: RecordSubInput) => {
          const game = getCurrentGame(get());
          const point = getCurrentPoint(game);
          if (point == null) throw new Error('No active point.');

          let stoppageFound = false;
          for (const possession of point.possessions) {
            for (const action of possession.actions) {
              if (action.id === input.stoppageActionId) {
                if (action.kind !== 'stoppage') {
                  throw new Error(`Action "${input.stoppageActionId}" is not a stoppage.`);
                }
                if (action.reason !== 'injury') {
                  throw new Error('Only injury stoppages can have subs.');
                }
                stoppageFound = true;
                break;
              }
            }
            if (stoppageFound) break;
          }
          if (!stoppageFound) {
            throw new Error(
              `Stoppage action "${input.stoppageActionId}" not found in current point.`,
            );
          }

          assertValidSideIds(game, [input.sideId]);
          assertValidParticipantRefs(game, [
            ...input.inIds.map((id) => ({ refType: 'participant' as const, participantId: id })),
            ...input.outIds.map((id) => ({ refType: 'participant' as const, participantId: id })),
          ]);

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
            pushUndoEntry(state, {
              kind: 'sub',
              pointId: livePoint.id,
              subId,
            });
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
              removeActionById(
                liveGame,
                lastUndoEntry.pointId,
                lastUndoEntry.possessionId,
                lastUndoEntry.actionId,
              );
              syncDerivedHalftimeTransition(liveGame);
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
            } else if (lastUndoEntry.kind === 'sub') {
              const point = liveGame.points.find(
                (candidate) => candidate.id === lastUndoEntry.pointId,
              );
              if (point?.subs != null) {
                point.subs = point.subs.filter((sub) => sub.id !== lastUndoEntry.subId);
                if (point.subs.length === 0) {
                  point.subs = undefined;
                }
              }
            } else if (lastUndoEntry.kind === 'resume_stoppage') {
              const point = liveGame.points.find(
                (candidate) => candidate.id === lastUndoEntry.pointId,
              );
              for (const possession of point?.possessions ?? []) {
                const action = possession.actions.find(
                  (candidate) => candidate.id === lastUndoEntry.actionId,
                );
                if (action?.kind === 'stoppage') {
                  action.resumedAt = undefined;
                }
              }
            }

            state.undoStack.pop();
            liveGame.updatedAt = Date.now();
          });

          return true;
        },

        deleteSavedGame: (gameId) => {
          set((state) => {
            const remainingGames = state.savedGames.filter((game) => game.id !== gameId);
            state.savedGames = remainingGames;
            if (state.currentGameId === gameId) {
              state.currentGameId = null;
            }
            state.undoStack = state.undoStack.filter((entry) =>
              remainingGames.some((game) =>
                game.points.some((point) => point.id === entry.pointId),
              ),
            );
          });
        },
      }),
      {
        name: ADVANCED_TRACKING_STORAGE_KEY,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          currentGameId: state.currentGameId,
          savedGames: state.savedGames,
        }),
      },
    ),
  ),
);
