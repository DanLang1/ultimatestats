export type PointOutcome = {
  label: string;
  isPositive: boolean;
};

export function getPointOutcome(
  scoringTeam: 'team1' | 'team2',
  offensiveTeam: 'team1' | 'team2',
  turnoverCount: number,
): PointOutcome {
  const weScored = scoringTeam === 'team1';
  const weStartedOnOffense = offensiveTeam === 'team1';

  if (weStartedOnOffense) {
    if (weScored) {
      return turnoverCount === 0
        ? { label: 'CLEAN HOLD', isPositive: true }
        : { label: 'DIRTY HOLD', isPositive: true };
    }
    return { label: 'BROKEN', isPositive: false };
  }
  if (weScored) {
    return { label: 'BREAK', isPositive: true };
  }
  return { label: 'OPP HOLD', isPositive: false };
}
