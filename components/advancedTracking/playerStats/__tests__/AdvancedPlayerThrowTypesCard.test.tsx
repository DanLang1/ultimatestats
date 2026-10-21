import { screen } from '@testing-library/react-native';

import AdvancedPlayerThrowTypesCard from '@/components/advancedTracking/playerStats/AdvancedPlayerThrowTypesCard';
import {
  getAdvancedPlayerStatsForParticipant,
  type AdvancedPlayerStats,
} from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { renderScreen } from '@/test/render';

function createMockStats(overrides: Partial<AdvancedPlayerStats> = {}): AdvancedPlayerStats {
  return { ...getAdvancedPlayerStatsForParticipant([], 'p1'), ...overrides };
}

describe('AdvancedPlayerThrowTypesCard', () => {
  it('returns null when there are no throw type stats', async () => {
    const stats = createMockStats();
    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.queryByTestId('advanced-player-throw-types-card')).toBeNull();
  });

  it('renders huck rate, completions count, and inline outcome details when huck attempts exist', async () => {
    const stats = createMockStats({
      huckAttempts: 7,
      huckCompletions: 3,
      huckCompletionPct: 3 / 7,
      huckIncompletions: 4,
      huckThrowaways: 1,
      huckBlocks: 1,
      huckDrops: 1,
      huckPressures: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByTestId('advanced-player-throw-types-card')).toBeTruthy();
    expect(screen.getByText('Throw classifications')).toBeTruthy();
    expect(screen.getByText('43%')).toBeTruthy();
    expect(screen.getByText('3 of 7')).toBeTruthy();
    expect(screen.getByText('Completions')).toBeTruthy();
    expect(screen.getByText('3 completed')).toBeTruthy();
    expect(screen.getByText('1 throwaway')).toBeTruthy();
    expect(screen.getByText('1 blocked')).toBeTruthy();
    expect(screen.getByText('1 dropped')).toBeTruthy();
    expect(screen.getByText('1 pressured')).toBeTruthy();
  });

  it('renders reset turnovers and breakdown', async () => {
    const stats = createMockStats({
      resetTurnovers: 2,
      resetThrowaways: 1,
      resetBlocks: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByText('BACKFIELD TURNOVERS')).toBeTruthy();
    expect(screen.getByText('1 throwaway')).toBeTruthy();
    expect(screen.getByText('1 blocked')).toBeTruthy();
  });

  it('describes a dropped reset as the turnover outcome', async () => {
    const stats = createMockStats({
      resetTurnovers: 1,
      resetDrops: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByText('BACKFIELD TURNOVERS')).toBeTruthy();
    expect(screen.getByText('dropped throw')).toBeTruthy();
  });

  it('renders receiving targets with huck terminology and reset drops', async () => {
    const stats = createMockStats({
      hucksCaught: 2,
      hucksDropped: 1,
      resetsDropped: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByText('HUCK RECEIVING')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('Catch rate')).toBeTruthy();
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(screen.getByText('Hucks caught')).toBeTruthy();
    expect(screen.getByText('2 hucks caught')).toBeTruthy();
    expect(screen.getByText('1 huck dropped')).toBeTruthy();
    expect(screen.getByText('BACKFIELD TURNOVERS')).toBeTruthy();
    expect(screen.getByText('1 reset dropped')).toBeTruthy();
  });
});
