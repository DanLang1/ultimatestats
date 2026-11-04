import type { GameListItem, LinkedGameListItem } from '@/lib/gameListUtils';
import { GameKind, Tournament, TournamentGameLink } from '@/lib/storage/types';

/** Basic and advanced games live in separate stores; an ID only identifies a game with its kind. */
export interface GameRef {
  kind: GameKind;
  id: string;
}

export interface TournamentIndex {
  tournamentFor: (game: GameRef) => Tournament | null;
}

export function buildTournamentIndex(
  tournaments: Tournament[],
  links: TournamentGameLink[],
): TournamentIndex {
  const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const tournamentIdByGame: Record<GameKind, Map<string, string>> = {
    basic: new Map(),
    advanced: new Map(),
  };
  for (const link of links) {
    tournamentIdByGame[link.gameKind].set(link.gameId, link.tournamentId);
  }

  return {
    tournamentFor(game) {
      const tournamentId = tournamentIdByGame[game.kind].get(game.id);
      if (tournamentId === undefined) return null;
      const tournament = tournamentById.get(tournamentId);
      // deleteTournament removes its links, so a dangling link is a bug.
      if (!tournament) throw new Error(`Game linked to missing tournament ${tournamentId}`);
      return tournament;
    },
  };
}

export function attachTournaments(
  games: GameListItem[],
  index: TournamentIndex,
): LinkedGameListItem[] {
  return games.map((game) => ({ ...game, tournament: index.tournamentFor(game) }));
}
