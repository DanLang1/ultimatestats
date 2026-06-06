import { TournamentGameLink, TournamentKind } from '@/lib/storage/types';

export function getTournamentIdsByGame(
  links: TournamentGameLink[],
  gameKind: TournamentKind,
): Map<string, string> {
  return new Map(
    links
      .filter((link) => link.gameKind === gameKind)
      .map((link) => [link.gameId, link.tournamentId]),
  );
}
