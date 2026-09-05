import { screen, within } from '@testing-library/react-native';

import { GameEvent } from '@/store/basic/gameStore.types';
import { renderScreen } from '@/test/render';

import TeamStatsSection from '../TeamStatsSection';

const goal = (
  team: 'team1' | 'team2',
  goalPlayerId?: string,
  assistPlayerId?: string,
): GameEvent => ({
  type: 'goal',
  team,
  goalPlayerId: goalPlayerId ?? null,
  assistPlayerId: assistPlayerId ?? null,
});

const turnover = (
  team: 'team1' | 'team2',
  subtype: 'block' | 'throwaway' | 'drop' | 'fiftyfifty',
): GameEvent => ({
  type: 'turnover',
  team,
  subtype,
  playerId: null,
});

async function renderSection(events: GameEvent[]) {
  await renderScreen(
    <TeamStatsSection
      events={events}
      startingPossession="team1"
      gameTo={15}
      team1Name="Us"
      team2Name="Them"
    />,
  );
}

describe('TeamStatsSection', () => {
  it('renders nothing when there are no events', async () => {
    await renderSection([]);

    expect(screen.queryByTestId('basic-team-stats-card')).toBeNull();
  });

  it('shows singular and plural count labels for a single clean hold', async () => {
    await renderSection([goal('team1', 'Alice', 'Bob')]);

    const card = within(screen.getByTestId('basic-team-stats-card'));
    expect(card.getByText('TEAM PERFORMANCE')).toBeTruthy();
    expect(card.getByText('Clean Hold')).toBeTruthy();
    expect(card.queryByText('Clean Holds')).toBeNull();
    expect(card.getByText('Breaks')).toBeTruthy();
    expect(card.getByText('Times Broken')).toBeTruthy();
    expect(card.getByText('Turnovers')).toBeTruthy();
    expect(card.queryByText('Turn(s)')).toBeNull();
  });

  it('uses singular labels for a single broken point with one turnover', async () => {
    await renderSection([turnover('team1', 'throwaway'), goal('team2')]);

    const card = within(screen.getByTestId('basic-team-stats-card'));
    expect(card.getByText('Time Broken')).toBeTruthy();
    expect(card.queryByText('Times Broken')).toBeNull();
    expect(card.getByText('Turnover')).toBeTruthy();
    expect(card.queryByText('Turnovers')).toBeNull();
  });
});
