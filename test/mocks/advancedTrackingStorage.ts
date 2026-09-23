import type { AdvancedGameHistorySnapshot } from '@/lib/advancedTracking/persistenceTypes';
import {
  compareAdvancedGameSummaries,
  deriveAdvancedGameSummary,
  type AdvancedGameSummary,
} from '@/lib/advancedTracking/summary';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';

const snapshots = new Map<string, AdvancedGameHistorySnapshot>();

export function resetAdvancedTrackingStorage() {
  snapshots.clear();
}

export async function loadAdvancedGameSummaries(): Promise<AdvancedGameSummary[]> {
  return [...snapshots.values()]
    .map(({ game }) => deriveAdvancedGameSummary(game))
    .sort(compareAdvancedGameSummaries);
}

export async function loadAdvancedGame(gameId: string): Promise<AdvancedTrackedGame | null> {
  return snapshots.get(gameId)?.game ?? null;
}

export async function loadAdvancedGameHistorySnapshot(
  gameId: string,
): Promise<AdvancedGameHistorySnapshot | null> {
  return snapshots.get(gameId) ?? null;
}

export async function upsertAdvancedGame(game: AdvancedTrackedGame): Promise<AdvancedGameSummary> {
  snapshots.set(game.id, { game, undoStack: [] });
  return deriveAdvancedGameSummary(game);
}

export async function upsertAdvancedLiveSnapshot(
  snapshot: AdvancedGameHistorySnapshot,
): Promise<AdvancedGameSummary> {
  snapshots.set(snapshot.game.id, snapshot);
  return deriveAdvancedGameSummary(snapshot.game);
}

export async function deleteAdvancedGameRecord(gameId: string): Promise<void> {
  snapshots.delete(gameId);
}
