export interface CapStatusInput {
  isHardcap: boolean;
  isSoftCap: boolean;
  softCapPending: boolean;
  team1Score: number;
  team2Score: number;
  team1Name: string;
  team2Name: string;
}

export type CapStatus =
  | { kind: 'universe-point' }
  | { kind: 'hardcap-lead'; leadingTeam: string; message: string }
  | { kind: 'softcap-active'; message: string }
  | { kind: 'softcap-pending'; message: string }
  | { kind: 'none' };

/** Resolve which cap message (if any) the game status screen should show. */
export function getCapStatusMessage({
  isHardcap,
  isSoftCap,
  softCapPending,
  team1Score,
  team2Score,
  team1Name,
  team2Name,
}: CapStatusInput): CapStatus {
  if (isHardcap) {
    if (team1Score === team2Score) return { kind: 'universe-point' };
    const team1Leads = team1Score > team2Score;
    const leadingTeam = team1Leads ? team1Name : team2Name;
    const trailingTeam = team1Leads ? team2Name : team1Name;
    const canTie = Math.abs(team1Score - team2Score) === 1;
    return {
      kind: 'hardcap-lead',
      leadingTeam,
      message: canTie ? `wins unless ${trailingTeam} scores` : 'wins after this point',
    };
  }
  if (isSoftCap) return { kind: 'softcap-active', message: 'Softcap Active' };
  if (softCapPending) return { kind: 'softcap-pending', message: 'Softcap Pending' };
  return { kind: 'none' };
}
