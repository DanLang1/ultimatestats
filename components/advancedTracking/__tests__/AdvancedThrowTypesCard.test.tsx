import { screen, userEvent, within } from '@testing-library/react-native';

import AdvancedThrowTypesCard from '@/components/advancedTracking/AdvancedThrowTypesCard';
import type { AdvancedThrowTypeStats } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { computeAdvancedThrowTypeStats } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { renderScreen } from '@/test/render';

function throwTypesFor(
  build: () => ReturnType<typeof createAdvancedGameScenario>,
): AdvancedThrowTypeStats {
  const game = buildAnalyticsGame(build().build());
  return computeAdvancedThrowTypeStats(game, ADVANCED_TEST_FOCUS_SIDE_ID);
}

function huckDropTypes(): AdvancedThrowTypeStats {
  return throwTypesFor(() =>
    createAdvancedGameScenario({ id: 'huck-drop' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .turnover('drop', { details: { type: 'huck' } }),
  );
}

function resetThrowawayTypes(): AdvancedThrowTypeStats {
  return throwTypesFor(() =>
    createAdvancedGameScenario({ id: 'reset-throwaway' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .turnover('throwaway', { details: { type: 'backfield_reset' } }),
  );
}

function unclassifiedTypes(game: AnalyticsGame): AdvancedThrowTypeStats {
  return computeAdvancedThrowTypeStats(game, ADVANCED_TEST_FOCUS_SIDE_ID);
}

function expectThrowStat(label: string, value: string, ratio?: string) {
  const card = within(screen.getByTestId('advanced-throw-types-card'));
  const stat = card.getByText(label).parent;
  if (stat == null) throw new Error(`Missing stat card: ${label}`);
  expect(within(stat).getByText(value)).toBeTruthy();
  if (ratio != null) expect(within(stat).getByText(ratio)).toBeTruthy();
}

describe('AdvancedThrowTypesCard', () => {
  it('renders nothing when no throws are classified', async () => {
    const game = buildAnalyticsGame(
      createAdvancedGameScenario({ id: 'unclassified' })
        .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
        .goal(participantRef('alex'))
        .build(),
    );

    await renderScreen(<AdvancedThrowTypesCard throwTypes={unclassifiedTypes(game)} />);

    expect(screen.queryByTestId('advanced-throw-types-card')).toBeNull();
  });

  it('shows huck completion with singular turnover labels for a single huck drop', async () => {
    await renderScreen(<AdvancedThrowTypesCard throwTypes={huckDropTypes()} />);

    expect(screen.getByText('THROW TYPES')).toBeTruthy();
    expect(screen.getByText('HUCKS')).toBeTruthy();
    expectThrowStat('Completion', '0%', '0/1');
    expectThrowStat('Attempts', '1');
    expectThrowStat('Turnover', '1');
    expectThrowStat('Drop', '1');
    expect(screen.queryByText('Turnovers')).toBeNull();
    expect(screen.queryByText('Drops')).toBeNull();
    expect(screen.queryByText('BACKFIELD RESETS')).toBeNull();
  });

  it('shows backfield resets with singular labels for a single reset throwaway', async () => {
    await renderScreen(<AdvancedThrowTypesCard throwTypes={resetThrowawayTypes()} />);

    expect(screen.getByText('BACKFIELD RESETS')).toBeTruthy();
    expectThrowStat('Turnover', '1');
    expectThrowStat('Throwaway', '1');
    expect(screen.queryByText('HUCKS')).toBeNull();
  });

  it('explains that classifications are optional', async () => {
    await renderScreen(<AdvancedThrowTypesCard throwTypes={huckDropTypes()} />);

    await userEvent.press(screen.getByLabelText('About throw classifications'));
    expect(screen.getByText('Throw Classifications')).toBeTruthy();
    expect(
      screen.getByText('Classifications are optional, so this data may not be fully accurate.'),
    ).toBeTruthy();
    await userEvent.press(screen.getByText('OK'));
  });
});
