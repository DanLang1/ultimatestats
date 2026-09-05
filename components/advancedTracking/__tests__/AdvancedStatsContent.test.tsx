import { screen, userEvent, within } from '@testing-library/react-native';
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

function expectStatCard(label: string, value: string, ratio: string) {
  const card = screen.getByText(label).parent;
  if (card == null) throw new Error(`Expected a stat card for "${label}".`);
  expect(within(card).getByText(value)).toBeTruthy();
  expect(within(card).getByText(ratio)).toBeTruthy();
}

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

  it('shows the four conversion rings, ratios, secondary efficiency metrics, and help', async () => {
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

    const holdRing = within(screen.getByTestId('advanced-stat-ring-hold'));
    expect(holdRing.getByText('Hold')).toBeTruthy();
    expect(holdRing.getByText('100%')).toBeTruthy();
    expect(holdRing.getByText('1/1')).toBeTruthy();

    const oConversionRing = within(screen.getByTestId('advanced-stat-ring-o-conv'));
    expect(oConversionRing.getByText('O Conv')).toBeTruthy();
    expect(oConversionRing.getByText('100%')).toBeTruthy();
    expect(oConversionRing.getByText('1/1')).toBeTruthy();

    const breakRing = within(screen.getByTestId('advanced-stat-ring-break-eff'));
    expect(breakRing.getByText('Break Eff')).toBeTruthy();
    expect(breakRing.getByText('—')).toBeTruthy();
    expect(breakRing.getByText('0/0')).toBeTruthy();

    const dConversionRing = within(screen.getByTestId('advanced-stat-ring-d-conv'));
    expect(dConversionRing.getByText('D Conv')).toBeTruthy();
    expect(dConversionRing.getByText('—')).toBeTruthy();
    expect(dConversionRing.getByText('0/0')).toBeTruthy();

    expectStatCard('D-Efficiency', '—', '0/0');
    expectStatCard('Overall Conversion', '100%', '1/1');
    expect(screen.getByLabelText('About efficiency stats')).toBeTruthy();

    const ringHelpContent = [
      {
        accessibilityLabel: 'About Hold Rate',
        title: 'Hold Rate',
        message:
          'How often you score when starting on offense.\n\nFormula: Holds ÷ completed O-points',
      },
      {
        accessibilityLabel: 'About O-Possession Conversion',
        title: 'O-Possession Conversion',
        message:
          'How often you score on a possession during an O-point.\n\nFormula: Scoring possessions on O-points ÷ possessions on O-points',
      },
      {
        accessibilityLabel: 'About Break Efficiency',
        title: 'Break Efficiency',
        message:
          'When you gain at least one chance on a completed D-point, how often do you break?\n\nFormula: Breaks ÷ completed D-points with at least one possession',
      },
      {
        accessibilityLabel: 'About D-Possession Conversion',
        title: 'D-Possession Conversion',
        message:
          'How often you score on a possession during a D-point.\n\nFormula: Scoring possessions on D-points ÷ possessions on D-points',
      },
    ];

    for (const helpContent of ringHelpContent) {
      await userEvent.press(screen.getByLabelText(helpContent.accessibilityLabel));
      expect(screen.getByText(helpContent.title)).toBeTruthy();
      expect(screen.getByText(helpContent.message)).toBeTruthy();
      await userEvent.press(screen.getByText('OK'));
    }

    await userEvent.press(screen.getByLabelText('About efficiency stats'));
    expect(screen.getByText('Efficiency Stats')).toBeTruthy();
    expect(
      screen.getByText(
        'D-Efficiency: breaks ÷ all completed D-points.\n\nOverall Conversion: scoring possessions ÷ all possessions.',
      ),
    ).toBeTruthy();
  });

  it('shows dashes and 0/0 ratios when no possession samples exist', async () => {
    const analyticsGame = buildAnalyticsGame(game);
    const emptyGame = {
      ...analyticsGame,
      points: [],
      possessions: [],
      actions: [],
      attributions: [],
    };

    await renderScreen(
      <AdvancedStatsContent
        game={emptyGame}
        gameId={game.id}
        myTeamName="Light"
        opponentName="Dark"
        myScore={0}
        opponentScore={0}
        perspectiveSideId={LIGHT}
        participantNames={emptyGame.participantNames}
      />,
    );

    for (const testID of [
      'advanced-stat-ring-hold',
      'advanced-stat-ring-o-conv',
      'advanced-stat-ring-break-eff',
      'advanced-stat-ring-d-conv',
    ]) {
      const ring = within(screen.getByTestId(testID));
      expect(ring.getByText('—')).toBeTruthy();
      expect(ring.getByText('0/0')).toBeTruthy();
    }

    expectStatCard('D-Efficiency', '—', '0/0');
    expectStatCard('Overall Conversion', '—', '0/0');
  });

  it('shows time of possession within the possession and game flow card', async () => {
    const timedGame = JSON.parse(JSON.stringify(game)) as AdvancedTrackedGame;
    const point = timedGame.points[0];
    point.startedAt = 1_000;
    point.possessions[0].actions.forEach((action, index) => {
      action.recordedAt = 1_000 + index * 10_000;
    });
    const analyticsGame = buildAnalyticsGame(timedGame);

    await renderScreen(
      <AdvancedStatsContent
        game={analyticsGame}
        gameId={timedGame.id}
        myTeamName="Light"
        opponentName="Dark"
        myScore={1}
        opponentScore={0}
        perspectiveSideId={LIGHT}
        participantNames={analyticsGame.participantNames}
      />,
    );

    const possessionCard = within(screen.getByTestId('advanced-possession-flow-card'));
    expect(possessionCard.getByTestId('time-of-possession-title')).toBeTruthy();
  });

  it('shows classified team stats and exposes the player Types group on demand', async () => {
    const classifiedGame = JSON.parse(JSON.stringify(game)) as AdvancedTrackedGame;
    const goalAction = classifiedGame.points[0].possessions[0].actions.at(-1);
    if (goalAction?.kind !== 'throw') throw new Error('Expected goal throw fixture.');
    goalAction.details = { type: 'huck' };
    const analyticsGame = buildAnalyticsGame(classifiedGame);

    await renderScreen(
      <AdvancedStatsContent
        game={analyticsGame}
        gameId={classifiedGame.id}
        myTeamName="Light"
        opponentName="Dark"
        myScore={1}
        opponentScore={0}
        perspectiveSideId={LIGHT}
        participantNames={analyticsGame.participantNames}
      />,
    );

    expect(screen.getByTestId('advanced-throw-types-card')).toBeTruthy();
    expect(screen.getByText('HUCKS')).toBeTruthy();
    expect(screen.queryByText('Huck Att')).toBeNull();

    await userEvent.press(screen.getByText('Types'));

    expect(screen.getByTestId('advanced-stats-column-huck-attempts')).toBeTruthy();
    expect(screen.getByTestId('advanced-stats-column-huck-completions')).toBeTruthy();
    expect(screen.getByTestId('advanced-stats-column-huck-completion-pct')).toBeTruthy();
    expect(screen.getByTestId('advanced-stats-column-reset-turnovers')).toBeTruthy();
    expect(screen.getByTestId('advanced-stats-column-hucks-caught')).toBeTruthy();
    expect(screen.queryByTestId('advanced-stats-column-huck-incompletions')).toBeNull();
    expect(screen.queryByTestId('advanced-stats-column-hucks-dropped')).toBeNull();
    expect(screen.queryByTestId('advanced-stats-column-resets-dropped')).toBeNull();
    expect(screen.getByText('BF Turn').props.numberOfLines).toBe(1);
  });
});
