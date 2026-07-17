import type { GameEvent } from '@/store/basic/gameStore.types';

import { getScoreThroughPoint } from '../advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '../advancedTracking/types';
import {
  createFormatSections,
  formatAdvancedHalftime,
  formatBasicHalftime,
  formatBasicReceiver,
  formatGenderRatio,
  formatHalftimeDisplay,
  formatTimeouts,
  formatValue,
  FormatRow,
} from '../gameFormatUtils';

jest.mock('../advancedTracking/trackingUtils', () => ({
  getScoreThroughPoint: jest.fn(),
}));

const mockGetScore = getScoreThroughPoint as jest.MockedFunction<typeof getScoreThroughPoint>;

function goal(
  team: 'team1' | 'team2',
  overrides: Partial<Extract<GameEvent, { type: 'goal' }>> = {},
): Extract<GameEvent, { type: 'goal' }> {
  return {
    type: 'goal',
    team,
    goalPlayerId: null,
    assistPlayerId: null,
    ...overrides,
  };
}

function makeAdvancedGame(overrides: Partial<AdvancedTrackedGame> = {}): AdvancedTrackedGame {
  return {
    settings: { format: { formatType: 'standard' }, locationMode: 'none' },
    points: [],
    sides: [],
    ...overrides,
  } as unknown as AdvancedTrackedGame;
}

function makeSettings(format?: Record<string, unknown>) {
  return {
    format: { formatType: 'standard' as const, ...format },
    locationMode: 'none' as const,
  };
}

describe('formatValue', () => {
  it('returns "Not set" for undefined', () => {
    expect(formatValue(undefined)).toBe('Not set');
  });

  it('returns string representation for zero', () => {
    expect(formatValue(0)).toBe('0');
  });

  it('returns string representation for positive numbers', () => {
    expect(formatValue(15)).toBe('15');
  });

  it('returns string representation for negative numbers', () => {
    expect(formatValue(-3)).toBe('-3');
  });
});

describe('formatTimeouts', () => {
  describe('when count is undefined', () => {
    it('defaults to 0', () => {
      expect(formatTimeouts(undefined, false, false)).toBe('0');
    });
  });

  describe('when useHalves is false', () => {
    it('returns count only', () => {
      expect(formatTimeouts(2, false, false)).toBe('2');
    });

    it('appends floater when floaterEnabled is true', () => {
      expect(formatTimeouts(2, true, false)).toBe('2 + floater');
    });

    it('handles floaterEnabled being undefined', () => {
      expect(formatTimeouts(2, undefined, false)).toBe('2');
    });
  });

  describe('when useHalves is true', () => {
    it('appends " / half" suffix', () => {
      expect(formatTimeouts(2, false, true)).toBe('2 / half');
    });

    it('appends both " / half" and floater', () => {
      expect(formatTimeouts(2, true, true)).toBe('2 / half + floater');
    });
  });

  describe('edge cases', () => {
    it('handles count of 0 with all options off', () => {
      expect(formatTimeouts(0, false, false)).toBe('0');
    });

    it('handles count of 0 with both halves and floater', () => {
      expect(formatTimeouts(0, true, true)).toBe('0 / half + floater');
    });

    it('handles undefined count with all options on', () => {
      expect(formatTimeouts(undefined, true, true)).toBe('0 / half + floater');
    });
  });
});

describe('formatGenderRatio', () => {
  describe('when gender ratio is disabled', () => {
    it('returns "Off" with more-women ratio', () => {
      expect(formatGenderRatio(false, 'more-women', 1)).toBe('Off');
    });

    it('returns "Off" with null ratio', () => {
      expect(formatGenderRatio(false, null, 1)).toBe('Off');
    });
  });

  describe('when gender ratio is enabled', () => {
    it('returns "On" when firstPointRatio is null', () => {
      expect(formatGenderRatio(true, null, 1)).toBe('On');
    });

    it('formats the active point in an ABBA sequence starting with more-women', () => {
      expect(formatGenderRatio(true, 'more-women', 1)).toBe('F2');
      expect(formatGenderRatio(true, 'more-women', 2)).toBe('M1');
      expect(formatGenderRatio(true, 'more-women', 3)).toBe('M2');
    });

    it('formats the active point in an ABBA sequence starting with more-men', () => {
      expect(formatGenderRatio(true, 'more-men', 1)).toBe('M2');
      expect(formatGenderRatio(true, 'more-men', 2)).toBe('F1');
      expect(formatGenderRatio(true, 'more-men', 3)).toBe('F2');
    });
  });
});

describe('formatBasicReceiver', () => {
  it('returns team1Name when startingPossession is team1', () => {
    expect(formatBasicReceiver('team1', 'Hawks', 'Eagles')).toBe('Hawks');
  });

  it('returns team2Name when startingPossession is team2', () => {
    expect(formatBasicReceiver('team2', 'Hawks', 'Eagles')).toBe('Eagles');
  });

  it('returns "Not set" when startingPossession is null', () => {
    expect(formatBasicReceiver(null, 'Hawks', 'Eagles')).toBe('Not set');
  });
});

describe('createFormatSections', () => {
  const mockRow = (label: string): FormatRow => ({ label, value: 'test' });

  describe('TEAMS section', () => {
    it('puts My Team, Opponent, and Initial Receiver into TEAMS', () => {
      const rows = [mockRow('My Team'), mockRow('Opponent'), mockRow('Initial Receiver')];
      const sections = createFormatSections(rows);
      const teamsSection = sections.find((s) => s.title === 'TEAMS');
      expect(teamsSection).toBeDefined();
      expect(teamsSection!.rows).toHaveLength(3);
    });

    it('includes only matching labels', () => {
      const rows = [mockRow('My Team'), mockRow('Game To')];
      const sections = createFormatSections(rows);
      const teamsSection = sections.find((s) => s.title === 'TEAMS');
      expect(teamsSection!.rows).toHaveLength(1);
      expect(teamsSection!.rows[0].label).toBe('My Team');
    });
  });

  describe('GAME RULES section', () => {
    it('puts all game rule labels into GAME RULES', () => {
      const labels = ['Game To', 'Hard Cap', 'Soft Cap', 'Halftime', 'Timeouts', 'Gender Ratio'];
      const rows = labels.map(mockRow);
      const sections = createFormatSections(rows);
      const rulesSection = sections.find((s) => s.title === 'GAME RULES');
      expect(rulesSection).toBeDefined();
      expect(rulesSection!.rows).toHaveLength(6);
    });
  });

  describe('FEATURES section', () => {
    it('puts feature labels into FEATURES', () => {
      const rows = [mockRow('Stat Tracking'), mockRow('Point Timer'), mockRow('Line Calling')];
      const sections = createFormatSections(rows);
      const featuresSection = sections.find((s) => s.title === 'FEATURES');
      expect(featuresSection).toBeDefined();
      expect(featuresSection!.rows).toHaveLength(3);
    });
  });

  describe('empty sections are removed', () => {
    it('omits FEATURES section when no feature rows exist', () => {
      const rows = [mockRow('My Team')];
      const sections = createFormatSections(rows);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('TEAMS');
    });

    it('omits GAME RULES section when no rule rows exist', () => {
      const rows = [mockRow('Stat Tracking')];
      const sections = createFormatSections(rows);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('FEATURES');
    });
  });

  describe('integration', () => {
    it('returns sections in TEAMS → GAME RULES → FEATURES order', () => {
      const rows = [
        mockRow('My Team'),
        mockRow('Game To'),
        mockRow('Stat Tracking'),
        mockRow('Opponent'),
        mockRow('Hard Cap'),
        mockRow('Point Timer'),
      ];
      const sections = createFormatSections(rows);
      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('TEAMS');
      expect(sections[1].title).toBe('GAME RULES');
      expect(sections[2].title).toBe('FEATURES');
    });

    it('preserves row order within each section', () => {
      const rows = [mockRow('My Team'), mockRow('Opponent'), mockRow('Initial Receiver')];
      const sections = createFormatSections(rows);
      const teamsSection = sections.find((s) => s.title === 'TEAMS')!;
      expect(teamsSection.rows[0].label).toBe('My Team');
      expect(teamsSection.rows[1].label).toBe('Opponent');
      expect(teamsSection.rows[2].label).toBe('Initial Receiver');
    });

    it('returns empty array when no rows match any section', () => {
      const rows = [mockRow('Unknown Label')];
      const sections = createFormatSections(rows);
      expect(sections).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      const sections = createFormatSections([]);
      expect(sections).toEqual([]);
    });
  });
});

describe('formatHalftimeDisplay', () => {
  describe('when disabled', () => {
    it('returns "Off"', () => {
      expect(formatHalftimeDisplay(false, 8, null, false)).toBe('Off');
    });
  });

  describe('when enabled with no scheduled score', () => {
    it('returns "On"', () => {
      expect(formatHalftimeDisplay(true, undefined, null, false)).toBe('On');
    });
  });

  describe('when enabled with scheduled score, not reached yet', () => {
    it('shows the scheduled score', () => {
      expect(formatHalftimeDisplay(true, 8, null, false)).toBe('At 8');
    });
  });

  describe('when reached at the scheduled score', () => {
    it('shows the scheduled score', () => {
      expect(formatHalftimeDisplay(true, 8, 8, false)).toBe('At 8');
    });
  });

  describe('when reached early', () => {
    it('shows the actual score with "(early)" suffix', () => {
      expect(formatHalftimeDisplay(true, 8, 5, true)).toBe('At 5 (early)');
    });

    it('returns scheduled score when actualScore is null despite triggeredEarly', () => {
      expect(formatHalftimeDisplay(true, 8, null, true)).toBe('At 8');
    });
  });
});

describe('formatBasicHalftime', () => {
  it('returns "Off" when autoHalftime is disabled', () => {
    expect(formatBasicHalftime([], false, 15)).toBe('Off');
  });

  it('returns "At <scheduled>" when halftime not yet reached', () => {
    const events: GameEvent[] = [goal('team1'), goal('team1')];

    expect(formatBasicHalftime(events, true, 15)).toBe('At 8');
  });

  it('returns "At <scheduled>" when reached at normal score', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1', { triggeredHalftime: true }),
    ];

    expect(formatBasicHalftime(events, true, 15)).toBe('At 8');
  });

  it('returns "At <score> (early)" when triggered early', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team2'),
      goal('team1', { triggeredHalftime: true }),
    ];

    expect(formatBasicHalftime(events, true, 15)).toBe('At 3 (early)');
  });
});

describe('formatAdvancedHalftime', () => {
  beforeEach(() => {
    mockGetScore.mockReset();
  });

  it('returns "Off" when no halftimeAt configured', () => {
    const game = makeAdvancedGame();

    expect(formatAdvancedHalftime(game)).toBe('Off');
  });

  it('returns "At <scheduled>" when no halftime transition exists', () => {
    const game = makeAdvancedGame({
      settings: makeSettings({ halftimeAt: 8 }),
    });

    expect(formatAdvancedHalftime(game)).toBe('At 8');
  });

  it('returns "At <scheduled>" when halftime reached at normal score', () => {
    const game = makeAdvancedGame({
      settings: makeSettings({ halftimeAt: 8 }),
      gameTransitions: [{ id: 'h1', transitionType: 'halftime', afterPointId: 'pt8' }],
    });

    expect(formatAdvancedHalftime(game)).toBe('At 8');
  });

  it('returns "At <score> (early)" when triggered early', () => {
    mockGetScore.mockReturnValue({ sideA: 4, sideB: 2 });

    const game = makeAdvancedGame({
      settings: makeSettings({ halftimeAt: 8 }),
      gameTransitions: [
        {
          id: 'h1',
          transitionType: 'halftime',
          afterPointId: 'pt5',
          triggeredEarly: true,
        },
      ],
    });

    expect(formatAdvancedHalftime(game)).toBe('At 4 (early)');
    expect(mockGetScore).toHaveBeenCalledWith(game, 'pt5');
  });

  it('returns "At <scheduled>" when triggeredEarly is true but score computation fails', () => {
    mockGetScore.mockReturnValue({ sideA: 0, sideB: 0 });

    const game = makeAdvancedGame({
      settings: makeSettings({ halftimeAt: 8 }),
      gameTransitions: [
        {
          id: 'h1',
          transitionType: 'halftime',
          afterPointId: 'pt_bad',
          triggeredEarly: true,
        },
      ],
    });

    expect(formatAdvancedHalftime(game)).toBe('At 0 (early)');
  });
});
