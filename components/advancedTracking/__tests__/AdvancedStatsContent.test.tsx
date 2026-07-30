import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

const LIGHT = 'light';
const DARK = 'dark';

const game: AdvancedTrackedGame = {
  id: 'scrimmage-1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'scrimmage',
  status: 'final',
  focusSideId: LIGHT,
  initialReceivingSideId: LIGHT,
  settings: { locationMode: 'none' },
  sides: [
    { id: LIGHT, label: 'Light', trackingMode: 'full-roster' },
    { id: DARK, label: 'Dark', trackingMode: 'full-roster' },
  ],
  participants: [
    { id: 'joe', name: 'Joe' },
    { id: 'sam', name: 'Sam' },
  ],
  points: [
    {
      id: 'point-1',
      lines: [
        { sideId: LIGHT, participantIds: ['joe'] },
        { sideId: DARK, participantIds: ['sam'] },
      ],
      possessions: [
        {
          id: 'possession-1',
          sideId: LIGHT,
          actions: [
            {
              id: 'pull-1',
              kind: 'pull',
              sideId: DARK,
              receivingSideId: LIGHT,
              puller: { refType: 'participant', participantId: 'sam' },
              receiver: { refType: 'participant', participantId: 'joe' },
              result: 'inbound',
            },
            {
              id: 'goal-1',
              kind: 'throw',
              sideId: LIGHT,
              thrower: { refType: 'participant', participantId: 'joe' },
              result: 'goal',
            },
          ],
        },
      ],
    },
  ],
};

describe('AdvancedStatsContent', () => {
  beforeEach(() => {
    resetMockRouter();
    jest.clearAllMocks();
  });

  it('passes the selected side to player detail navigation', async () => {
    const analyticsGame = buildAnalyticsGame(game);
    await renderScreen(
      <AdvancedStatsContent
        game={analyticsGame}
        gameId={game.id}
        myTeamName="Light"
        opponentName="Dark"
        myScore={1}
        opponentScore={0}
        perspectiveSideId={LIGHT}
        participantNames={analyticsGame.participantNames}
      />,
    );

    await userEvent.press(screen.getByTestId('advanced-stats-row-joe'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/advancedTracking/analytics/playerStats',
      params: {
        gameId: game.id,
        participantId: 'joe',
        sideId: LIGHT,
      },
    });
  });
});
