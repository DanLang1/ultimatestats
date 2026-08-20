import { screen, userEvent } from '@testing-library/react-native';

import AdvancedPlayerThrowTypesCard from '@/components/advancedTracking/playerStats/AdvancedPlayerThrowTypesCard';
import type { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { renderScreen } from '@/test/render';

function createMockStats(overrides: Partial<AdvancedPlayerStats> = {}): AdvancedPlayerStats {
  return {
    participantId: 'p1',
    goals: 0,
    assists: 0,
    hockeyAssists: 0,
    callahans: 0,
    plusMinus: 0,
    completions: 0,
    throwAttempts: 0,
    completionPct: null,
    throwaways: 0,
    stalls: 0,
    stallsConceded: 0,
    receptions: 0,
    drops: 0,
    totalTouches: 0,
    blocks: 0,
    pressures: 0,
    pulls: 0,
    pullReceptions: 0,
    inboundPulls: 0,
    outOfBoundsPulls: 0,
    droppedPulls: 0,
    rollerPulls: 0,
    avgPullHangTimeMs: null,
    maxPullHangTimeMs: null,
    minPullHangTimeMs: null,
    huckAttempts: 0,
    huckCompletions: 0,
    huckCompletionPct: null,
    huckIncompletions: 0,
    huckThrowaways: 0,
    huckDrops: 0,
    huckBlocks: 0,
    huckPressures: 0,
    resetThrowaways: 0,
    resetDrops: 0,
    resetBlocks: 0,
    resetPressures: 0,
    resetTurnovers: 0,
    hucksCaught: 0,
    hucksDropped: 0,
    resetsDropped: 0,
    pointsPlayed: 0,
    oPoints: 0,
    dPoints: 0,
    pointPlusMinus: 0,
    oEfficiency: null,
    dEfficiency: null,
    pointDurationMs: null,
    playingTimePct: null,
    ...overrides,
  };
}

describe('AdvancedPlayerThrowTypesCard', () => {
  it('returns null when there are no throw type stats', async () => {
    const stats = createMockStats();
    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.queryByTestId('advanced-player-throw-types-card')).toBeNull();
  });

  it('renders huck rate, completions count, and inline outcome details when huck attempts exist', async () => {
    const stats = createMockStats({
      huckAttempts: 4,
      huckCompletions: 3,
      huckCompletionPct: 0.75,
      huckIncompletions: 1,
      huckThrowaways: 1,
      huckBlocks: 1,
      huckDrops: 1,
      huckPressures: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByTestId('advanced-player-throw-types-card')).toBeTruthy();
    expect(screen.getByText('THROW CLASSIFICATIONS')).toBeTruthy();
    expect(screen.getByText('HUCK THROWING')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('Completion rate')).toBeTruthy();
    expect(screen.getByText('3 of 4')).toBeTruthy();
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

    expect(screen.getByText('RESET TURNOVERS')).toBeTruthy();
    expect(screen.getByText('1 throwaway')).toBeTruthy();
    expect(screen.getByText('1 blocked')).toBeTruthy();
  });

  it('describes a dropped reset as the turnover outcome', async () => {
    const stats = createMockStats({
      resetTurnovers: 1,
      resetDrops: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);

    expect(screen.getByText('RESET TURNOVERS')).toBeTruthy();
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
    expect(screen.getByText('RESET TURNOVERS')).toBeTruthy();
    expect(screen.getByText('1 reset dropped')).toBeTruthy();
  });

  it('shows the information alert from an accessible touch target', async () => {
    const user = userEvent.setup();
    const stats = createMockStats({
      huckAttempts: 2,
      huckCompletions: 2,
      huckCompletionPct: 1,
    });

    await renderScreen(<AdvancedPlayerThrowTypesCard stats={stats} />);
    const infoButton = screen.getByRole('button', { name: 'About throw classifications' });
    expect(infoButton.props.style.height).toBeGreaterThanOrEqual(44);
    expect(infoButton.props.style.width).toBeGreaterThanOrEqual(44);
    await user.press(infoButton);

    expect(screen.getByText('Throw Classifications')).toBeTruthy();
    expect(
      screen.getByText('Classifications are optional, so this data may not be fully accurate.'),
    ).toBeTruthy();
  });
});
