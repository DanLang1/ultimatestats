import { screen } from '@testing-library/react-native';

import { StoppageOverlay } from '@/components/advancedTracking/StoppageOverlay';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { renderScreen } from '@/test/render';

function createDualInjuryGame(): AdvancedTrackedGame {
  return {
    id: 'dual-injury-game',
    schemaVersion: 2,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'scrimmage',
    status: 'in_progress',
    focusSideId: 'light',
    initialReceivingSideId: 'light',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'light', label: 'Light', trackingMode: 'full-roster' },
      { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
    ],
    participants: [
      { id: 'light-in', name: 'Sara' },
      { id: 'light-out', name: 'Brittany' },
      { id: 'dark-in', name: 'Devin' },
      { id: 'dark-out', name: 'Morgan' },
    ],
    points: [
      {
        id: 'point-1',
        startedAt: 0,
        lines: [
          { sideId: 'light', participantIds: ['light-out'] },
          { sideId: 'dark', participantIds: ['dark-out'] },
        ],
        subs: [
          {
            id: 'light-sub',
            sideId: 'light',
            type: 'injury',
            inIds: ['light-in'],
            outIds: ['light-out'],
            stoppageActionId: 'injury-1',
          },
          {
            id: 'dark-sub',
            sideId: 'dark',
            type: 'injury',
            inIds: ['dark-in'],
            outIds: ['dark-out'],
            stoppageActionId: 'injury-1',
          },
        ],
        possessions: [
          {
            id: 'possession-1',
            sideId: 'light',
            actions: [
              {
                id: 'injury-1',
                kind: 'stoppage',
                reason: 'injury',
                pausedAt: 1_000,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('StoppageOverlay', () => {
  it('shows injury substitutions for both tracked sides', async () => {
    const game = createDualInjuryGame();

    await renderScreen(<StoppageOverlay game={game} />);

    expect(screen.getByText('LIGHT')).toBeVisible();
    expect(screen.getByText('Sara')).toBeVisible();
    expect(screen.getByText('Brittany')).toBeVisible();
    expect(screen.getByText('DARK')).toBeVisible();
    expect(screen.getByText('Devin')).toBeVisible();
    expect(screen.getByText('Morgan')).toBeVisible();
  });

  it('keeps resume and edit actions available when an injury has no subs', async () => {
    const game = createDualInjuryGame();
    game.points[0].subs = undefined;

    await renderScreen(<StoppageOverlay game={game} />);

    expect(screen.getByTestId('stoppage-resume')).toBeVisible();
    expect(screen.getByTestId('stoppage-edit-sub')).toBeVisible();
  });
});
