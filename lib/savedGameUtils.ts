import { SavedGame } from '@/lib/storage';

export function getGameDisplayTimestamp(game: Pick<SavedGame, 'createdAt' | 'playedAt'>): number {
  return game.playedAt ?? game.createdAt;
}
