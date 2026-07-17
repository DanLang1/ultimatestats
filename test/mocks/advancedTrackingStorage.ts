import {
  compareAdvancedGameSummaries,
  deriveAdvancedGameSummary,
  type AdvancedGameSummary,
} from '@/lib/advancedTracking/summary';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';

const games = new Map<string, AdvancedTrackedGame>();

export function resetAdvancedTrackingStorage() {
  games.clear();
}

export async function loadAdvancedGameSummaries(): Promise<AdvancedGameSummary[]> {
  return [...games.values()].map(deriveAdvancedGameSummary).sort(compareAdvancedGameSummaries);
}

export async function loadAdvancedGame(gameId: string): Promise<AdvancedTrackedGame | null> {
  return games.get(gameId) ?? null;
}

export async function upsertAdvancedGame(game: AdvancedTrackedGame): Promise<AdvancedGameSummary> {
  games.set(game.id, game);
  return deriveAdvancedGameSummary(game);
}

export async function deleteAdvancedGameRecord(gameId: string): Promise<void> {
  games.delete(gameId);
}
