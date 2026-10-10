import { getPointOutcome } from '@/lib/basic/pointOutcomeUtils';

describe('getPointOutcome', () => {
  it.each([
    ['team1', 'team1', 0, 'CLEAN HOLD', true],
    ['team1', 'team1', 2, 'DIRTY HOLD', true],
    ['team2', 'team1', 0, 'BROKEN', false],
    ['team1', 'team2', 0, 'BREAK', true],
    ['team2', 'team2', 0, 'OPP HOLD', false],
  ] as const)(
    'scored by %s, started on %s offense, %s turnovers: %s',
    (scoringTeam, offensiveTeam, turnovers, label, isPositive) => {
      expect(getPointOutcome(scoringTeam, offensiveTeam, turnovers)).toEqual({ label, isPositive });
    },
  );
});
