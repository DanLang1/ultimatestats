import { advancedGameToListItem, basicGameToListItem } from '../gameListUtils';
import type { AdvancedTrackedGame } from '../advancedTracking/types';
import type { SavedGame, SavedTeam } from '../storage';

// ── basicGameToListItem ────────────────────────────────────────────────────────

const baseBasicGame: SavedGame = {
  id: 'basic1',
  schemaVersion: 5,
  createdAt: 1000,
  team1: { id: 'team1', name: 'My Team', roster: [] },
  team2Name: 'Their Team',
  team1Score: 13,
  team2Score: 7,
  events: [],
  gameTo: 15,
  gameLength: 100,
  startingPossession: 'team1',
};

const savedTeams: SavedTeam[] = [{ id: 'team1', name: 'Saved Name', roster: [] }];

describe('basicGameToListItem', () => {
  it('maps core fields correctly', () => {
    const item = basicGameToListItem(baseBasicGame, []);
    expect(item.kind).toBe('basic');
    expect(item.id).toBe('basic1');
    expect(item.myScore).toBe(13);
    expect(item.opponentScore).toBe(7);
    expect(item.opponentName).toBe('Their Team');
  });

  it('uses createdAt as timestamp when playedAt is absent', () => {
    const item = basicGameToListItem(baseBasicGame, []);
    expect(item.timestamp).toBe(1000);
  });

  it('uses playedAt as timestamp when present', () => {
    const item = basicGameToListItem({ ...baseBasicGame, playedAt: 5000 }, []);
    expect(item.timestamp).toBe(5000);
  });

  it('resolves team name from savedTeams when a match exists', () => {
    const item = basicGameToListItem(baseBasicGame, savedTeams);
    expect(item.myTeamName).toBe('Saved Name');
  });

  it('falls back to game team1.name when no saved team matches', () => {
    const item = basicGameToListItem(baseBasicGame, []);
    expect(item.myTeamName).toBe('My Team');
  });

  it('counts goals from events for pointsTracked', () => {
    const game: SavedGame = {
      ...baseBasicGame,
      events: [
        { type: 'goal', team: 'team1', goalPlayerId: null, assistPlayerId: null },
        { type: 'goal', team: 'team1', goalPlayerId: null, assistPlayerId: null },
        { type: 'turnover', team: 'team1', subtype: 'throwaway', playerId: null },
      ],
    };
    const item = basicGameToListItem(game, []);
    expect(item.pointsTracked).toBe(2);
  });

  it('passes through tournamentId and importedAt when present', () => {
    const game: SavedGame = { ...baseBasicGame, tournamentId: 'tour1', importedAt: 999 };
    const item = basicGameToListItem(game, []);
    if (item.kind !== 'basic') throw new Error('expected basic kind');
    expect(item.tournamentId).toBe('tour1');
    expect(item.importedAt).toBe(999);
  });
});

// ── advancedGameToListItem ────────────────────────────────────────────────────

const ZOO = 'zoo';
const RIVALS = 'rivals';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const untracked = { refType: 'untracked' as const };

const scoredPoint = {
  id: 'pt1',
  lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
  possessions: [
    {
      id: 'pos1',
      sideId: ZOO,
      actions: [
        {
          id: 'pull1',
          kind: 'pull' as const,
          sideId: RIVALS,
          receivingSideId: ZOO,
          puller: untracked,
          result: 'inbound' as const,
        },
        {
          id: 'a1',
          kind: 'throw' as const,
          sideId: ZOO,
          thrower: august,
          toPlayer: meves,
          result: 'goal' as const,
        },
      ],
    },
  ],
};

const baseAdvancedGame: AdvancedTrackedGame = {
  id: 'adv1',
  schemaVersion: 1,
  createdAt: 2000,
  updatedAt: 2000,
  gameType: 'game',
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  settings: { locationMode: 'none' },
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'p_august', name: 'August' },
    { id: 'p_meves', name: 'Meves' },
  ],
  points: [scoredPoint],
};

describe('advancedGameToListItem', () => {
  it('maps core fields correctly', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.kind).toBe('advanced');
    expect(item.id).toBe('adv1');
  });

  it('derives myTeamName from focusSide label', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.myTeamName).toBe('Zoo');
  });

  it('uses metadata.opponentName when available', () => {
    const game: AdvancedTrackedGame = {
      ...baseAdvancedGame,
      metadata: { opponentName: 'Custom Rivals' },
    };
    expect(advancedGameToListItem(game).opponentName).toBe('Custom Rivals');
  });

  it('falls back to oppSide label when metadata.opponentName is absent', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.opponentName).toBe('Rivals');
  });

  it('uses oppSide label when metadata.opponentName is absent', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    // baseAdvancedGame has no metadata → falls back to oppSide.label ('Rivals')
    expect(item.opponentName).toBe('Rivals');
  });

  it('derives scores by counting goals in points', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.myScore).toBe(1);
    expect(item.opponentScore).toBe(0);
  });

  it('uses metadata.date as timestamp when valid', () => {
    const game: AdvancedTrackedGame = {
      ...baseAdvancedGame,
      metadata: { date: '2024-07-04' },
    };
    const expected = new Date('2024-07-04').getTime();
    expect(advancedGameToListItem(game).timestamp).toBe(expected);
  });

  it('falls back to createdAt when metadata.date is absent', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.timestamp).toBe(2000);
  });

  it('falls back to createdAt when metadata.date is invalid', () => {
    const game: AdvancedTrackedGame = {
      ...baseAdvancedGame,
      metadata: { date: 'not-a-date' },
    };
    expect(advancedGameToListItem(game).timestamp).toBe(2000);
  });

  it('counts total points for pointsTracked', () => {
    const item = advancedGameToListItem(baseAdvancedGame);
    expect(item.pointsTracked).toBe(1);
  });
});
