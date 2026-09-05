import { screen, within } from '@testing-library/react-native';

import AdvancedPossessionFlowCard from '@/components/advancedTracking/AdvancedPossessionFlowCard';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { computeAdvancedTimeOfPossessionStats } from '@/lib/advancedTracking/advancedTimeOfPossessionUtils';
import { getAnalyticsOpposingSideId } from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { renderScreen } from '@/test/render';

function holdScenarioBuilder(timed: boolean) {
  const timing = timed ? { startedAt: 1_000, recordedAt: 1_000 } : {};
  const actionTiming = timed ? { recordedAt: 5_000 } : {};
  const endTiming = timed ? { recordedAt: 15_000 } : {};
  return createAdvancedGameScenario({ id: timed ? 'timed-hold' : 'untimed-hold' })
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex'), ...timing })
    .complete(participantRef('blair'), actionTiming)
    .goal(participantRef('blair'), endTiming);
}

async function renderCard(timed: boolean) {
  const game = buildAnalyticsGame(holdScenarioBuilder(timed).build());
  const teamStats = computeAdvancedTeamStats(game, ADVANCED_TEST_FOCUS_SIDE_ID);
  const opposingSideId = getAnalyticsOpposingSideId(game, ADVANCED_TEST_FOCUS_SIDE_ID);
  const topStats = computeAdvancedTimeOfPossessionStats(
    game,
    ADVANCED_TEST_FOCUS_SIDE_ID,
    opposingSideId,
  );

  await renderScreen(
    <AdvancedPossessionFlowCard
      teamStats={teamStats}
      topStats={topStats}
      team1Name="Focus"
      team2Name="Opponent"
    />,
  );
}

function expectFlowStat(label: string, value: string, ratio?: string) {
  const card = within(screen.getByTestId('advanced-possession-flow-card'));
  const stat = card.getByText(label).parent;
  if (stat == null) throw new Error(`Missing stat card: ${label}`);
  expect(within(stat).getByText(value)).toBeTruthy();
  if (ratio != null) expect(within(stat).getByText(ratio)).toBeTruthy();
}

describe('AdvancedPossessionFlowCard', () => {
  it('shows momentum and possession flow stats for a single-possession hold', async () => {
    await renderCard(false);

    const card = within(screen.getByTestId('advanced-possession-flow-card'));
    expect(card.getByText('POSSESSION & GAME FLOW')).toBeTruthy();
    expect(card.getByText('MOMENTUM')).toBeTruthy();
    expectFlowStat('Run', '1');
    expectFlowStat('Drought', '0');
    expect(card.getByText('POSSESSION FLOW')).toBeTruthy();
    expectFlowStat('Avg Poss/Pt', '1.0');
    expectFlowStat('Multi-Turn Pts', '0%', '0/1');
  });

  it('shows time of possession when timing data exists', async () => {
    await renderCard(true);

    const card = within(screen.getByTestId('advanced-possession-flow-card'));
    expect(card.getByTestId('time-of-possession-title')).toBeTruthy();
  });

  it('omits time of possession without timing data', async () => {
    await renderCard(false);

    expect(screen.queryByTestId('time-of-possession-title')).toBeNull();
  });
});
