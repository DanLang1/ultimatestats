export interface TimeOfPossessionStats {
  hasTopData: boolean;
  team1TotalPossessionMs: number;
  team2TotalPossessionMs: number;
  /** 0-100 */
  team1PossessionPct: number;
  /** 0-100 */
  team2PossessionPct: number;
  /** Points included in the calculation */
  timedPointCount: number;
}
