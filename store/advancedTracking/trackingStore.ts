import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draft } from 'immer';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { correctAdvancedPointActiveLines } from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import {
  correctAdvancedTouch,
  type CorrectAdvancedTouchInput,
} from '@/lib/advancedTracking/advancedTouchCorrectionUtils';
import {
  correctAdvancedTurnover,
  type CorrectAdvancedTurnoverInput,
} from '@/lib/advancedTracking/advancedTurnoverCorrectionUtils';
import { planCaptureIntent } from '@/lib/advancedTracking/captureIntentUtils';
import {
  applyCapture,
  applyPull,
  applyPullDropAmendment,
  applyRedZone,
  applyThrowType,
} from '@/lib/advancedTracking/captureWrites';
import { createAdvancedGame, removeActionById } from '@/lib/advancedTracking/gameMutations';
import { applyPointNote, withAdvancedGameNote } from '@/lib/advancedTracking/gameNoteUtils';
import {
  getAdjustedHalftimeTimerDuration,
  getDefaultHalftimeTimerState,
} from '@/lib/advancedTracking/halftimeTimerUtils';
import { applyInjurySubs, applyInjurySubUpdate } from '@/lib/advancedTracking/injurySubUtils';
import { deriveRosterParticipantSyncPlan } from '@/lib/advancedTracking/participantSync';
import type { AdvancedGameHistorySnapshot } from '@/lib/advancedTracking/persistenceTypes';
import {
  applyGameClockPause,
  applyGameClockResume,
  applyStoppage,
  applyStoppageResume,
} from '@/lib/advancedTracking/stoppageWrites';
import {
  assertCommandAllowed,
  canAmendOpeningPull,
  canChangeLine,
  canClearRedZone,
  canPauseGameClock,
  canRecordStoppage,
  canSetRedZone,
  canUndo,
  getGameClockPauseTapTarget,
  getStoppageTapTarget,
  planTimeout,
} from '@/lib/advancedTracking/trackerCommands';
import type { AdvancedGameLookupState } from '@/lib/advancedTracking/trackingUtils';
import {
  assertValidLines,
  assertValidParticipantRefs,
  assertValidSideIds,
  canStartSecondHalfEarly,
  deriveHalftimeTransition,
  getActiveAdvancedGame,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getLiveInProgressGame,
  hasPointEnded,
  isAdvancedGameOver,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import {
  applyBetweenPointTimeout,
  applyBetweenPointTimeoutEnd,
  applyEarlyHalftime,
} from '@/lib/advancedTracking/transitionWrites';
import { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import {
  applyUndo,
  assertUndoTargets,
  assertValidUndoStack,
} from '@/lib/advancedTracking/undoOperations';
import { reportError, reportHydrationError } from '@/lib/sentry';
import { generateId, isRecord } from '@/lib/utils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { registerActiveAdvancedGameGetter, useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

import { getCurrentPendingNextPointLineSelection } from './pendingLineSelection';
import {
  AdvancedTrackingState,
  AdvancedTrackingUndoEntry,
  RecordInjurySubsInput,
  RecordStoppageInput,
  UpdateInjurySubsInput,
  UpdatePointNoteInput,
  UpdateThrowTypeInput,
} from './trackingStore.types';

const ADVANCED_TRACKING_STORAGE_KEY = 'ultimatestats_advanced_tracking';
const ADVANCED_TRACKING_STORAGE_VERSION = 1;

/**
 * When the storage version is bumped, add handling for
 * the previously-current version here.
 */
function migrateAdvancedTrackingRecoveryState(persistedState: unknown, version: number): unknown {
  if (version !== 0) {
    throw new Error(`Unsupported advanced-tracking recovery version "${version}".`);
  }

  return persistedState;
}

function getCurrentGame(state: AdvancedGameLookupState): AdvancedTrackedGame {
  if (state.currentGameId == null) throw new Error('No active game.');
  const game = getActiveAdvancedGame(state);
  if (game == null) {
    throw new Error(`currentGameId "${state.currentGameId}" not loaded.`);
  }
  return game;
}

/**
 * Runs `edit` on the live game draft and stamps `updatedAt` with the store's commit time. Every
 * in-place write to the live game goes through here.
 */
function writeLiveGame<T>(
  state: Draft<AdvancedTrackingState>,
  committedAt: number,
  edit: (game: AdvancedTrackedGame) => T,
): T {
  const game = getCurrentGame(state);
  const result = edit(game);
  game.updatedAt = committedAt;
  return result;
}

function pushUndoEntry(
  state: Draft<AdvancedTrackingState>,
  ...entries: AdvancedTrackingUndoEntry[]
) {
  state.undoStack.push(...entries);
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

/**
 * Replaces `currentGame` / `currentGameId`. A null id leaves the game shown but inactive (a finished
 * game); null for both clears it. Every change starts with no undo history, no drafted next line,
 * and no halftime break.
 */
function setActiveGame(
  state: Draft<AdvancedTrackingState>,
  game: AdvancedTrackedGame | null,
  gameId: string | null,
) {
  state.currentGame = game;
  state.currentGameId = gameId;
  state.undoStack = [];
  clearPendingNextPointLineSelection(state);
  setHalftimeBreakActive(state, false);
}

function reconcileDerivedHalftimeBreak(state: Draft<AdvancedTrackingState>) {
  const game = state.currentGame;
  if (game == null) {
    state.isHalftimeBreakActive = false;
    resetHalftimeTimerState(state);
    return;
  }

  const { isActive, gameTransitions } = deriveHalftimeTransition(game);
  state.currentGame = { ...game, gameTransitions };
  state.isHalftimeBreakActive = isActive;
  if (!isActive) {
    resetHalftimeTimerState(state);
  }
}

/** Drops a loaded undo stack whose entries reference targets missing from the loaded game. */
function getRestorableUndoStack(
  snapshot: AdvancedGameHistorySnapshot | null,
): AdvancedTrackingUndoEntry[] {
  if (snapshot == null) return [];
  try {
    assertValidUndoStack(snapshot.game, snapshot.undoStack);
    return snapshot.undoStack;
  } catch (error) {
    reportError('advanced-undo-stack-load', error);
    return [];
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
          const currentGameAtStart = get().currentGame;
          const snapshot = await useSavedAdvancedGamesStore
            .getState()
            .loadActiveGameSnapshot(currentGameId);
          if (get().currentGameId !== currentGameId || get().currentGame !== currentGameAtStart) {
            return snapshot?.game ?? null;
          }
          const undoStack = getRestorableUndoStack(snapshot);
          set((state) => {
            if (state.currentGameId !== currentGameId) return;
            state.currentGame = snapshot?.game ?? null;
            state.undoStack = undoStack;
            reconcilePendingNextPointLineSelection(state);
            reconcileDerivedHalftimeBreak(state);
          });
          return snapshot?.game ?? null;
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
          const game = createAdvancedGame(input, {
            id: input.id ?? generateId(),
            now: Date.now(),
          });
          set((state) => {
            setActiveGame(state, game, game.id);
          });
          return game.id;
        },

        resetCurrentGame: () => {
          const gameId = get().currentGameId;
          set((state) => {
            setActiveGame(state, null, null);
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
              `Cannot finalize game before it is over. Score is ${score[game.sides[0].id]}-${score[game.sides[1].id]} with target ${effectiveGameTo}. Use finishTerminatedGame(...) to end early.`,
            );
          }
          const gameToPersist: AdvancedTrackedGame = { ...game, status: 'final', updatedAt: now };
          await useSavedAdvancedGamesStore.getState().saveGame(gameToPersist);
          set((state) => {
            setActiveGame(state, gameToPersist, null);
          });
        },

        finishTerminatedGame: async (endReason) => {
          const game = getCurrentGame(get());
          if (game.status !== 'terminated' && endReason == null) {
            throw new Error('Cannot finish a game that has not been terminated.');
          }
          const gameToPersist: AdvancedTrackedGame =
            endReason == null
              ? game
              : { ...game, status: 'terminated', endReason, updatedAt: Date.now() };
          await useSavedAdvancedGamesStore.getState().saveGame(gameToPersist);
          set((state) => {
            setActiveGame(state, gameToPersist, null);
          });
        },

        updateGameMetadata: async (metadata) => {
          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => {
              liveGame.metadata = withAdvancedGameNote(metadata, metadata.notes);
            });
          });
          await persistCurrentLiveGame();
        },

        updatePointNote: async ({ pointId, note }: UpdatePointNoteInput) => {
          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => applyPointNote(liveGame, pointId, note));
          });
          await persistCurrentLiveGame();
        },

        correctCurrentTouch: async (input: CorrectAdvancedTouchInput) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.status !== 'in_progress') {
              throw new Error('Only an in-progress game can be corrected through the live store.');
            }
            state.currentGame = correctAdvancedTouch(liveGame, input);
          });

          await persistCurrentLiveGame();
        },

        correctCurrentTurnover: async (input: CorrectAdvancedTurnoverInput) => {
          set((state) => {
            const liveGame = getCurrentGame(state);
            if (liveGame.status !== 'in_progress') {
              throw new Error('Only an in-progress game can be corrected through the live store.');
            }
            state.currentGame = correctAdvancedTurnover(liveGame, input);
          });

          await persistCurrentLiveGame();
        },

        correctCurrentGamePointActiveLines: (input) => {
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
          const currentPoint = getCurrentPoint(game);
          const isUnfinishedPoint = !hasPointEnded(point);
          const isCurrentUnfinishedPoint = isUnfinishedPoint && currentPoint?.id === point.id;
          if (isUnfinishedPoint && !isCurrentUnfinishedPoint) {
            throw new Error('Only the current or a completed point can have its lineup corrected.');
          }
          if (isCurrentUnfinishedPoint) {
            assertCommandAllowed(canChangeLine(game), 'correct the current line');
          }

          const correctedGame = correctAdvancedPointActiveLines(game, input);
          set((state) => {
            state.currentGame = correctedGame;
          });
          return persistCurrentLiveGame();
        },

        startGameClockPause: (reason) => {
          const game = getCurrentGame(get());
          assertCommandAllowed(canPauseGameClock(game), 'pause the game clock');

          const now = Date.now();
          let pauseId!: string;
          set((state) => {
            pauseId = writeLiveGame(state, now, (liveGame) =>
              applyGameClockPause(liveGame, reason, { at: now, newId: generateId }),
            );
          });
          return pauseId;
        },

        resumeGameClockPause: (pauseId) => {
          // A repeated Resume tap finds the pause already resumed.
          if (getGameClockPauseTapTarget(getCurrentGame(get()), pauseId) === 'settled') return;

          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => applyGameClockResume(liveGame, now));
          });
        },

        triggerHalftimeEarly: () => {
          if (get().currentGameId == null) {
            return false;
          }

          const game = getCurrentGame(get());
          const lastUndoEntry = get().undoStack.at(-1);

          if (!canStartSecondHalfEarly(game, lastUndoEntry)) {
            return false;
          }

          const now = Date.now();
          set((state) => {
            const undoEntry = writeLiveGame(state, now, (liveGame) =>
              applyEarlyHalftime(liveGame, generateId),
            );
            pushUndoEntry(state, undoEntry);
            setHalftimeBreakActive(state, true);
          });

          return true;
        },

        recordBetweenPointTimeout: (input) => {
          const game = getCurrentGame(get());
          assertValidSideIds(game, [input.sideId]);
          const timeout = planTimeout(game, input.sideId);
          assertCommandAllowed(timeout, 'call a timeout');
          if (timeout.plan.kind !== 'between-point') {
            throw new Error('Cannot record a between-point timeout before a point has ended.');
          }
          const { isFloater } = timeout.plan;

          const now = Date.now();
          let transitionId!: string;
          set((state) => {
            const undoEntry = writeLiveGame(state, now, (liveGame) =>
              applyBetweenPointTimeout(
                liveGame,
                { sideId: input.sideId, isFloater },
                { at: now, newId: generateId },
              ),
            );
            pushUndoEntry(state, undoEntry);
            transitionId = undoEntry.transitionId;
          });

          return transitionId;
        },

        endBetweenPointTimeout: (transitionId) => {
          const timeout = getCurrentPoint(getCurrentGame(get()))?.transitionsAfter?.find(
            (transition) => transition.id === transitionId,
          );
          if (timeout == null || timeout.transitionType !== 'timeout') return;

          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) =>
              applyBetweenPointTimeoutEnd(liveGame, transitionId, now),
            );
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

          const now = Date.now();
          let actionId!: string;
          set((state) => {
            const undoEntry = writeLiveGame(state, now, (liveGame) =>
              applyPull(liveGame, input, { at: now, newId: generateId }),
            );
            pushUndoEntry(state, undoEntry);
            actionId = undoEntry.actionId;
            clearPendingNextPointLineSelection(state);
          });

          return actionId;
        },

        amendOpeningPullAsDropped: (receiver) => {
          const game = getCurrentGame(get());
          assertValidParticipantRefs(game, [receiver]);
          assertCommandAllowed(canAmendOpeningPull(game), 'mark the pull as dropped');

          const now = Date.now();
          set((state) => {
            const undoEntry = writeLiveGame(state, now, (liveGame) =>
              applyPullDropAmendment(liveGame, receiver),
            );
            pushUndoEntry(state, undoEntry);
          });
        },

        recordCaptureIntent: (intent) => {
          const game = getCurrentGame(get());
          const planned = planCaptureIntent(game, intent);
          if (!planned.ok) return planned;
          const { hardCapMins, advancedSoftCapAtMins } = useSettingsStore.getState();
          const capTiming = {
            softCapAtMinutes: advancedSoftCapAtMins,
            hardCapAtMinutes: hardCapMins,
          };

          const now = Date.now();
          let visibleActionId!: string;
          set((state) => {
            const result = writeLiveGame(state, now, (liveGame) =>
              applyCapture(liveGame, planned.plan, { at: now, newId: generateId }, capTiming),
            );
            pushUndoEntry(state, ...result.undoEntries);
            if (result.isHalftimeBreakActive) {
              setHalftimeBreakActive(state, true);
            }
            visibleActionId = result.visibleActionId;
          });

          return { ok: true, actionId: visibleActionId };
        },

        setCurrentPossessionRedZone: (isRedZone) => {
          const game = getCurrentGame(get());
          if (isRedZone) {
            assertCommandAllowed(canSetRedZone(game), 'enter Red Zone');
          } else {
            assertCommandAllowed(canClearRedZone(game), 'clear Red Zone');
          }
          const currentPossession = getCurrentPossession(game);
          const activePossession = isPossessionOver(currentPossession) ? null : currentPossession;
          if ((activePossession?.redZone != null) === isRedZone) return;

          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) =>
              applyRedZone(liveGame, isRedZone, { at: now, newId: generateId }),
            );
          });
        },

        updateThrowType: (input: UpdateThrowTypeInput) => {
          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => applyThrowType(liveGame, input));
          });
        },

        recordStoppage: (input: RecordStoppageInput) => {
          const game = getCurrentGame(get());
          if (input.sideId != null) {
            assertValidSideIds(game, [input.sideId]);
          }
          let isFloater: boolean | undefined;
          if (input.reason === 'timeout') {
            const timeout = planTimeout(game, input.sideId);
            assertCommandAllowed(timeout, 'call a timeout');
            if (timeout.plan.kind !== 'in-point') {
              throw new Error('Cannot record a stoppage after the point has ended.');
            }
            isFloater = timeout.plan.isFloater;
          } else {
            assertCommandAllowed(canRecordStoppage(game), 'stop play');
          }

          const now = Date.now();
          let actionId!: string;
          set((state) => {
            actionId = writeLiveGame(state, now, (liveGame) =>
              applyStoppage(
                liveGame,
                { reason: input.reason, sideId: input.sideId, isFloater },
                { at: now, newId: generateId },
              ),
            );
          });
          return actionId;
        },

        resumeStoppage: (actionId: string) => {
          // A repeated Resume or Cancel tap finds the stoppage already resumed or removed.
          if (getStoppageTapTarget(getCurrentGame(get()), actionId) === 'settled') return;

          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => applyStoppageResume(liveGame, now));
          });
        },

        cancelStoppage: (actionId: string) => {
          // A repeated Resume or Cancel tap finds the stoppage already resumed or removed.
          if (getStoppageTapTarget(getCurrentGame(get()), actionId) === 'settled') return;

          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) => {
              const livePoint = getCurrentPoint(liveGame)!;
              const livePossession = getCurrentPossession(liveGame)!;
              removeActionById(liveGame, livePoint.id, livePossession.id, actionId);
            });
          });
        },

        recordInjurySubs: (input: RecordInjurySubsInput) => {
          assertCommandAllowed(
            canChangeLine(getCurrentGame(get())),
            'record an injury substitution',
          );

          const now = Date.now();
          let actionId!: string;
          set((state) => {
            actionId = writeLiveGame(state, now, (liveGame) =>
              applyInjurySubs(liveGame, input, { at: now, newId: generateId }),
            );
          });
          return actionId;
        },

        updateInjurySubs: (input: UpdateInjurySubsInput) => {
          const now = Date.now();
          set((state) => {
            writeLiveGame(state, now, (liveGame) =>
              applyInjurySubUpdate(liveGame, input, generateId),
            );
          });
        },

        undoLastOperation: () => {
          const entry = get().undoStack.at(-1);
          if (get().currentGameId == null || entry == null) return false;

          const game = getCurrentGame(get());
          if (!canUndo(game, entry).ok) return false;
          try {
            assertUndoTargets(game, entry);
          } catch (error) {
            // An entry whose targets are gone can never apply; drop only it and leave the game.
            reportError('advanced-undo', error);
            set((state) => {
              state.undoStack.pop();
            });
            return false;
          }

          const now = Date.now();
          set((state) => {
            const { isHalftimeBreakActive } = writeLiveGame(state, now, (liveGame) =>
              applyUndo(liveGame, entry, now),
            );
            state.undoStack.pop();
            setHalftimeBreakActive(state, isHalftimeBreakActive);
            reconcilePendingNextPointLineSelection(state);
          });
          return true;
        },

        importAdvancedGame: async (game) => {
          await useSavedAdvancedGamesStore.getState().saveGame(game);
          set((state) => {
            if (state.currentGameId === game.id) {
              state.currentGame = game;
              state.undoStack = [];
              reconcilePendingNextPointLineSelection(state);
              reconcileDerivedHalftimeBreak(state);
            }
          });
        },

        deleteSavedGame: async (gameId) => {
          await useSavedAdvancedGamesStore.getState().deleteGame(gameId);
          set((state) => {
            if (state.currentGameId === gameId) {
              setActiveGame(state, null, null);
            }
          });
        },
      }),
      {
        name: ADVANCED_TRACKING_STORAGE_KEY,
        storage: createJSONStorage(() => AsyncStorage),
        version: ADVANCED_TRACKING_STORAGE_VERSION,
        migrate: migrateAdvancedTrackingRecoveryState,
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(isRecord(persistedState) ? persistedState : {}),
          // Drop the legacy pre-v1 undoStack so a stale stack can never be restored against a newer game.
          undoStack: [],
        }),
        onRehydrateStorage: () => (state, error) => {
          reportHydrationError('advanced-tracking', error);
          if (state?.currentGameId != null) {
            void state.loadCurrentGame();
          }
        },
        partialize: (state): unknown => ({
          currentGameId: state.currentGameId,
          pendingNextPointLineSelection: state.pendingNextPointLineSelection,
          ...(state.isHalftimeBreakActive
            ? {
                halftimeTimerStartedAt: state.halftimeTimerStartedAt,
                halftimeTimerDurationSeconds: state.halftimeTimerDurationSeconds,
              }
            : {}),
        }),
      },
    ),
  ),
);

let lastPersistedLiveGame: AdvancedTrackedGame | null = null;
let lastPersistedUndoStack: AdvancedTrackingUndoEntry[] | null = null;
let lastLiveGamePersistPromise: Promise<void> | null = null;

export function persistLiveSnapshot(snapshot: AdvancedGameHistorySnapshot): Promise<void> {
  if (snapshot.game === lastPersistedLiveGame && snapshot.undoStack === lastPersistedUndoStack) {
    return lastLiveGamePersistPromise ?? Promise.resolve();
  }

  lastPersistedLiveGame = snapshot.game;
  lastPersistedUndoStack = snapshot.undoStack;
  const persistPromise = useSavedAdvancedGamesStore
    .getState()
    .saveLiveSnapshot(snapshot)
    .then(() => undefined);
  lastLiveGamePersistPromise = persistPromise;
  return persistPromise;
}

export function persistCurrentLiveGame(): Promise<void> {
  const { currentGame: game, undoStack } = useAdvancedTrackingStore.getState();
  if (game == null) {
    return Promise.resolve();
  }
  return persistLiveSnapshot({ game, undoStack });
}

useAdvancedTrackingStore.subscribe((state) => {
  const game = state.currentGame;
  if (game == null || state.currentGameId !== game.id) {
    return;
  }
  void persistLiveSnapshot({ game, undoStack: state.undoStack });
});

registerActiveAdvancedGameGetter(() => getLiveInProgressGame(useAdvancedTrackingStore.getState()));

useGameStore.subscribe((gameState) => {
  const game = getLiveInProgressGame(useAdvancedTrackingStore.getState());
  if (game == null) return;

  const plan = deriveRosterParticipantSyncPlan(game, gameState.currentTeam);
  if (plan == null) return;

  useAdvancedTrackingStore.setState((state) => {
    if (plan.participantsToAdd.length > 0) {
      writeLiveGame(state, Date.now(), (liveGame) => {
        liveGame.participants.push(...plan.participantsToAdd);
      });
    }

    if (plan.unavailableParticipantIds.size > 0) {
      const selection = getCurrentPendingNextPointLineSelection(
        getCurrentGame(state),
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
