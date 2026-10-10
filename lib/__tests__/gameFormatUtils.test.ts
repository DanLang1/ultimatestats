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

  it('returns string representation for a number', () => {
    expect(formatValue(15)).toBe('15');
  });
});

describe('formatTimeouts', () => {
  describe('when count is undefined', () => {
    it('defaults to 0', () => {
      expect(formatTimeouts(undefined, false, false)).toBe('0');
    });
  });

  describe('when useHalves is false', () => {
    it('returns count only when floater is false or unset', () => {
      expect(formatTimeouts(2, false, false)).toBe('2');
      expect(formatTimeouts(2, undefined, false)).toBe('2');
    });

    it('appends floater when floaterEnabled is true', () => {
      expect(formatTimeouts(2, true, false)).toBe('2 + floater');
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
    it('handles undefined count with all options on', () => {
      expect(formatTimeouts(undefined, true, true)).toBe('0 / half + floater');
    });
  });
});

describe('formatGenderRatio', () => {
  describe('when gender ratio is disabled', () => {
    it('returns "Off" regardless of the configured first-point ratio', () => {
      expect(formatGenderRatio(false, 'more-women', 1)).toBe('Off');
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
  const row = (label: string): FormatRow => ({ label, value: 'test' });

  it('groups recognized rows in section order while preserving row order and metadata', () => {
    const opponent: FormatRow = {
      label: 'Opponent',
      value: 'Eagles',
      helperText: 'Edit opponent',
      onPress: jest.fn(),
      disabled: true,
    };
    const teams = [opponent, row('Initial Receiver'), row('My Team')];
    const rules = ['Game To', 'Hard Cap', 'Soft Cap', 'Halftime', 'Timeouts', 'Gender Ratio'].map(
      row,
    );
    const features = ['Stat Tracking', 'Point Timer', 'Line Calling'].map(row);

    expect(
      createFormatSections([
        features[0],
        rules[0],
        ...teams,
        ...rules.slice(1),
        ...features.slice(1),
        row('Unknown Label'),
      ]),
    ).toEqual([
      { title: 'TEAMS', rows: teams },
      { title: 'GAME RULES', rows: rules },
      { title: 'FEATURES', rows: features },
    ]);
  });

  it.each([
    ['My Team', 'TEAMS'],
    ['Game To', 'GAME RULES'],
    ['Stat Tracking', 'FEATURES'],
  ])('omits empty sections when only %s is present', (label, title) => {
    expect(createFormatSections([row(label)])).toEqual([{ title, rows: [row(label)] }]);
  });

  it('omits unrecognized rows without creating empty sections', () => {
    expect(createFormatSections([row('Unknown Label')])).toEqual([]);
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
});
