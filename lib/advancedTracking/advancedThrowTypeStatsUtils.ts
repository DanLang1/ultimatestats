import type { AnalyticsGame, ThrowAnalyticsAction } from './analyticsTypes';
import { getEligibleThrowTypes, type ThrowType } from './types';

export interface AdvancedThrowTypeStats {
  huckAttempts: number;
  huckCompletions: number;
  huckCompletionPct: number | null;
  huckIncompletions: number;
  huckTurnovers: number;
  huckThrowaways: number;
  huckDrops: number;
  huckBlocks: number;
  huckPressures: number;
  resetTurnovers: number;
  resetThrowaways: number;
  resetDrops: number;
  resetBlocks: number;
  resetPressures: number;
}

export interface AdvancedPlayerThrowTypeStats extends AdvancedThrowTypeStats {
  hucksCaught: number;
  hucksDropped: number;
  resetsDropped: number;
}

type ThrowTypeVisibilityStats = Pick<
  AdvancedPlayerThrowTypeStats,
  'huckAttempts' | 'resetTurnovers' | 'hucksCaught' | 'hucksDropped' | 'resetsDropped'
>;

export function hasAnyThrowTypeStat(stats: ThrowTypeVisibilityStats): boolean {
  return (
    stats.huckAttempts +
      stats.resetTurnovers +
      stats.hucksCaught +
      stats.hucksDropped +
      stats.resetsDropped >
    0
  );
}

const EMPTY: AdvancedThrowTypeStats = {
  huckAttempts: 0,
  huckCompletions: 0,
  huckCompletionPct: null,
  huckIncompletions: 0,
  huckTurnovers: 0,
  huckThrowaways: 0,
  huckDrops: 0,
  huckBlocks: 0,
  huckPressures: 0,
  resetTurnovers: 0,
  resetThrowaways: 0,
  resetDrops: 0,
  resetBlocks: 0,
  resetPressures: 0,
};

export function createEmptyAdvancedThrowTypeStats(): AdvancedThrowTypeStats {
  return { ...EMPTY };
}

function isClassifiedThrow(action: ThrowAnalyticsAction, type: ThrowType): boolean {
  return action.details?.type === type && getEligibleThrowTypes(action.result).includes(type);
}

function isTurnoverResult(result: ThrowAnalyticsAction['result']) {
  return result === 'drop' || result === 'throwaway' || result === 'block' || result === 'pressure';
}

interface ClassifiedThrow {
  isHuck: boolean;
  isReset: boolean;
}

function classifyThrow(action: ThrowAnalyticsAction): ClassifiedThrow {
  return {
    isHuck: isClassifiedThrow(action, 'huck'),
    isReset: isClassifiedThrow(action, 'backfield_reset'),
  };
}

function applyClassifiedThrow(
  stats: AdvancedThrowTypeStats,
  action: ThrowAnalyticsAction,
  classification: ClassifiedThrow,
): void {
  const { isHuck, isReset } = classification;
  if (isHuck) {
    stats.huckAttempts += 1;
    if (action.result === 'complete' || action.result === 'goal') stats.huckCompletions += 1;
    if (isTurnoverResult(action.result)) {
      stats.huckIncompletions += 1;
      stats.huckTurnovers += 1;
    }
    if (action.result === 'drop') stats.huckDrops += 1;
    if (action.result === 'throwaway') stats.huckThrowaways += 1;
    if (action.result === 'block') stats.huckBlocks += 1;
    if (action.result === 'pressure') stats.huckPressures += 1;
  }

  if (isReset) {
    stats.resetTurnovers += 1;
    if (action.result === 'drop') stats.resetDrops += 1;
    if (action.result === 'throwaway') stats.resetThrowaways += 1;
    if (action.result === 'block') stats.resetBlocks += 1;
    if (action.result === 'pressure') stats.resetPressures += 1;
  }
}

export function computeAdvancedThrowTypeStats(
  game: AnalyticsGame,
  sideId: string,
): AdvancedThrowTypeStats {
  const stats = createEmptyAdvancedThrowTypeStats();

  for (const action of game.actions) {
    if (action.kind !== 'throw' || action.sideId !== sideId) continue;

    applyClassifiedThrow(stats, action, classifyThrow(action));
  }

  stats.huckCompletionPct =
    stats.huckAttempts > 0 ? stats.huckCompletions / stats.huckAttempts : null;
  return stats;
}

function createEmptyPlayerStats(): AdvancedPlayerThrowTypeStats {
  return {
    ...createEmptyAdvancedThrowTypeStats(),
    hucksCaught: 0,
    hucksDropped: 0,
    resetsDropped: 0,
  };
}

/**
 * Derives player throw-type facts from action actor/receiver IDs. Unknown is preserved by the
 * analytics compiler, while intentionally anonymous refs remain null and are omitted.
 */
export function computeAdvancedPlayerThrowTypeStats(
  game: AnalyticsGame,
  sideId?: string,
): Map<string, AdvancedPlayerThrowTypeStats> {
  const byPlayer = new Map<string, AdvancedPlayerThrowTypeStats>();
  const get = (id: string) => {
    let stats = byPlayer.get(id);
    if (!stats) {
      stats = createEmptyPlayerStats();
      byPlayer.set(id, stats);
    }
    return stats;
  };

  for (const action of game.actions) {
    if (action.kind !== 'throw' || (sideId != null && action.sideId !== sideId)) continue;
    const classification = classifyThrow(action);
    const { isHuck, isReset } = classification;
    if (!isHuck && !isReset) continue;

    const result = action.result;
    const thrower = action.actorId;
    if (thrower != null) {
      applyClassifiedThrow(get(thrower), action, classification);
    }

    if (action.receiverId != null && (result === 'complete' || result === 'goal')) {
      if (isHuck) get(action.receiverId).hucksCaught += 1;
    }
    if (action.receiverId != null && result === 'drop') {
      if (isHuck) get(action.receiverId).hucksDropped += 1;
      if (isReset) get(action.receiverId).resetsDropped += 1;
    }
  }

  for (const stats of byPlayer.values()) {
    stats.huckCompletionPct =
      stats.huckAttempts > 0 ? stats.huckCompletions / stats.huckAttempts : null;
  }
  return byPlayer;
}
