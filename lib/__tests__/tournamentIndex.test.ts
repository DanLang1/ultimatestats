import type { Tournament, TournamentGameLink } from '../storage/types';
import { buildTournamentIndex } from '../tournamentIndex';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'basic-tournament',
    schemaVersion: 1,
    kind: 'basic',
    name: 'Spring Fling',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeLink(overrides: Partial<TournamentGameLink> = {}): TournamentGameLink {
  return {
    id: 'link-1',
    schemaVersion: 1,
    tournamentId: 'basic-tournament',
    gameKind: 'basic',
    gameId: 'game-1',
    createdAt: 1000,
    ...overrides,
  };
}

describe('buildTournamentIndex', () => {
  it('resolves the same game id to each kind’s own tournament', () => {
    const index = buildTournamentIndex(
      [
        makeTournament(),
        makeTournament({ id: 'advanced-tournament', kind: 'advanced', name: 'Fall Classic' }),
      ],
      [
        makeLink(),
        makeLink({ id: 'link-2', tournamentId: 'advanced-tournament', gameKind: 'advanced' }),
      ],
    );

    expect(index.tournamentFor({ kind: 'basic', id: 'game-1' })?.id).toBe('basic-tournament');
    expect(index.tournamentFor({ kind: 'advanced', id: 'game-1' })?.id).toBe('advanced-tournament');
  });

  it('returns null for an unlinked game', () => {
    const index = buildTournamentIndex([makeTournament()], [makeLink()]);

    expect(index.tournamentFor({ kind: 'basic', id: 'game-2' })).toBeNull();
  });
});
