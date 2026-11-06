import { isCompletedAdvancedGameSummary } from '../advancedTracking/summary';
import type { AdvancedGameSummary } from '../advancedTracking/summary';
import type { AdvancedTrackedGame } from '../advancedTracking/types';
import {
  advancedGameSummaryToListItem,
  advancedGameSummaryToTeamListItem,
  advancedGameToListItem,
  basicGameToListItem,
  formatGameRowAccessibilityLabel,
  formatPointDifferential,
  formatRecord,
  getMarginsOldestFirst,
  getPointTotals,
  GameListItem,
} from '../gameListUtils';
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
    expect(item.teamId).toBe('team1');
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
    { id: ZOO, label: 'Zoo', sourceTeamId: 'team-zoo', trackingMode: 'full-roster' },
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
    if (item.kind !== 'advanced') throw new Error('expected advanced kind');
    expect(item.gameType).toBe('game');
  });

  it("identifies the team by the focus side's source team", () => {
    expect(advancedGameToListItem(baseAdvancedGame).teamId).toBe('team-zoo');
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
});

// ── advancedGameSummaryToListItem ─────────────────────────────────────────────

const advancedSummary: AdvancedGameSummary = {
  id: 'summary1',
  schemaVersion: 1,
  createdAt: 1000,
  updatedAt: 2000,
  playedAt: 1500,
  sortTimestamp: 1500,
  status: 'final',
  gameType: 'game',
  focusSideId: ZOO,
  focusSourceTeamId: 'team-zoo',
  myTeamName: 'Zoo',
  opponentName: 'Rivals',
  myScore: 12,
  opponentScore: 10,
  pointsTracked: 22,
};

describe('advancedGameSummaryToListItem', () => {
  it('maps summary fields without requiring the full game record', () => {
    const item = advancedGameSummaryToListItem(advancedSummary);

    expect(item).toEqual({
      kind: 'advanced',
      gameType: 'game',
      id: 'summary1',
      teamId: 'team-zoo',
      timestamp: 1500,
      myTeamName: 'Zoo',
      opponentName: 'Rivals',
      myScore: 12,
      opponentScore: 10,
    });
  });

  it('preserves the scrimmage game type for saved-game presentation', () => {
    const item = advancedGameSummaryToListItem({
      ...advancedSummary,
      gameType: 'scrimmage',
    });

    expect(item.kind).toBe('advanced');
    if (item.kind !== 'advanced') throw new Error('expected advanced kind');
    expect(item.gameType).toBe('scrimmage');
  });

  it('identifies only finished advanced summaries as completed saved games', () => {
    expect(isCompletedAdvancedGameSummary({ ...advancedSummary, status: 'final' })).toBe(true);
    expect(isCompletedAdvancedGameSummary({ ...advancedSummary, status: 'terminated' })).toBe(true);
    expect(isCompletedAdvancedGameSummary({ ...advancedSummary, status: 'in_progress' })).toBe(
      false,
    );
  });
});

describe('advancedGameSummaryToTeamListItem', () => {
  const renamedTeams: SavedTeam[] = [{ id: 'team-a', name: 'New Name', roster: [] }];

  it("names a renamed team's games by the live saved-team name", () => {
    const item = advancedGameSummaryToTeamListItem(
      { ...advancedSummary, focusSourceTeamId: 'team-a', myTeamName: 'Old Name' },
      renamedTeams,
    );

    expect(item.myTeamName).toBe('New Name');
  });
});

describe('formatRecord', () => {
  const scrimmage: GameListItem = {
    kind: 'advanced',
    gameType: 'scrimmage',
    id: 's',
    teamId: 'zoo',
    timestamp: 1,
    myTeamName: 'Light',
    opponentName: 'Dark',
    myScore: 5,
    opponentScore: 3,
  };

  it('adds ties and counts scrimmages separately', () => {
    expect(formatRecord([listItem('w', 1, 2, 1), listItem('l', 2, 1, 2)])).toBe('1–1');
    expect(formatRecord([listItem('w', 1, 2, 1), listItem('t', 2, 2, 2)])).toBe('1–0–1');
    expect(formatRecord([listItem('w', 1, 2, 1), scrimmage])).toBe('1–0 · 1 scrim');
    expect(formatRecord([scrimmage, { ...scrimmage, id: 's2' }])).toBe('2 scrims');
  });
});

describe('getPointTotals', () => {
  it('sums both sides and skips scrimmages', () => {
    const scrimmage: GameListItem = {
      ...listItem('s', 3, 9, 1),
      kind: 'advanced',
      gameType: 'scrimmage',
    };
    expect(getPointTotals([listItem('a', 1, 15, 10), listItem('b', 2, 8, 15), scrimmage])).toEqual({
      pointsFor: 23,
      pointsAgainst: 25,
    });
  });
});

describe('getMarginsOldestFirst', () => {
  it('orders margins by game time and skips scrimmages', () => {
    const scrimmage: GameListItem = {
      ...listItem('s', 2, 9, 1),
      kind: 'advanced',
      gameType: 'scrimmage',
    };
    expect(
      getMarginsOldestFirst([listItem('late', 3, 8, 15), scrimmage, listItem('early', 1, 15, 10)]),
    ).toEqual([5, -7]);
  });
});

function listItem(id: string, timestamp: number, myScore = 1, opponentScore = 0): GameListItem {
  return {
    kind: 'basic',
    id,
    teamId: 'zoo',
    timestamp,
    myTeamName: 'Zoo',
    opponentName: 'Rivals',
    myScore,
    opponentScore,
  };
}

describe('formatPointDifferential', () => {
  it('signs the net margin with a real minus sign', () => {
    expect(formatPointDifferential([listItem('a', 1, 15, 10), listItem('b', 2, 12, 9)])).toBe('+8');
    expect(formatPointDifferential([listItem('a', 1, 10, 15)])).toBe('\u22125');
    expect(formatPointDifferential([listItem('a', 1, 15, 10), listItem('b', 2, 10, 15)])).toBe('0');
  });
});

describe('formatGameRowAccessibilityLabel', () => {
  it('names the winner and adds the date only when the row shows one', () => {
    expect(formatGameRowAccessibilityLabel(listItem('a', 1, 10, 13), 'Oct 3')).toBe(
      'Zoo versus Rivals, 10 to 13, Rivals by 3, Oct 3',
    );
    expect(formatGameRowAccessibilityLabel(listItem('a', 1, 9, 9), null)).toBe(
      'Zoo versus Rivals, 9 to 9, Tied',
    );
  });
});
