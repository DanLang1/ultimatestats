import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import type { SavedGame } from '@/lib/storage/types';

/** The fields a saved-games list shows, stored beside the full record so a list never loads one. */
export interface BasicGameSummary {
  id: string;
  schemaVersion: number;
  createdAt: number;
  /** When the game was played, falling back to when it was saved; lists sort and display by it. */
  sortTimestamp: number;
  team1Id: string;
  /** The team's name when the game was saved; lists resolve the current name from `team1Id`. */
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
}

export function deriveBasicGameSummary(game: SavedGame): BasicGameSummary {
  return {
    id: game.id,
    schemaVersion: game.schemaVersion,
    createdAt: game.createdAt,
    sortTimestamp: getGameDisplayTimestamp(game),
    team1Id: game.team1.id,
    team1Name: game.team1.name,
    team2Name: game.team2Name,
    team1Score: game.team1Score,
    team2Score: game.team2Score,
  };
}
