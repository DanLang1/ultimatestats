import {
  getAdvancedGameLabel,
  getAdvancedGameTimestamp,
  getAdvancedOpponentName,
  getAdvancedFocusTeamName,
} from '../advancedGameTeamUtils';
import type { AdvancedTrackedGame } from '../types';

const baseGame: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'final',
  focusSideId: 'focus-side',
  initialReceivingSideId: 'focus-side',
  settings: { locationMode: 'none' },
  sides: [
    {
      id: 'focus-side',
      label: 'Wildfire',
      sourceTeamId: 'team-wildfire',
      trackingMode: 'full-roster',
    },
    { id: 'opp-side', label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants: [],
  points: [],
};

describe('advancedGameTeamUtils', () => {
  it('uses the focus side label for display', () => {
    expect(getAdvancedFocusTeamName(baseGame)).toBe('Wildfire');
  });

  it('resolves timestamp, opponent name, and display label consistently', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      createdAt: 1000,
      metadata: {
        date: '2026-05-16T12:00:00.000Z',
        opponentName: 'Custom Rivals',
      },
    };

    expect(getAdvancedGameTimestamp(game)).toBe(new Date('2026-05-16T12:00:00.000Z').getTime());
    expect(getAdvancedOpponentName(game)).toBe('Custom Rivals');
    expect(getAdvancedGameLabel(game)).toContain('Custom Rivals');
  });
});
