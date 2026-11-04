import { GameKind, Tournament } from '@/lib/storage/types';

/** A tournament takes games of the kind it's locked to, or any kind while it has no games. */
export function isTournamentCompatible(tournament: Tournament, kind: GameKind): boolean {
  return tournament.kind === null || tournament.kind === kind;
}
