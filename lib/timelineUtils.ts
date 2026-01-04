import { GameEvent, TurnoverType } from '@/store/gameStore.types';

// Represents a turnover for display purposes
export interface DisplayTurnover {
  team: 'team1' | 'team2';
  type: TurnoverType;
  playerId: string | null;
  player2Id?: string | null;
}

// Represents all events that occurred during a single point
export interface PointEvents {
  pointNumber: number; // The point number (1, 2, 3...)
  scoringTeam: 'team1' | 'team2';
  scoreAfter: { team1: number; team2: number };
  // Goal info (if team1 scored) - now stores player IDs
  goalPlayerId: string | null;
  assistPlayerId: string | null;
  // Turnovers that happened during this point
  turnovers: DisplayTurnover[];
  // Possession data
  offensiveTeam: 'team1' | 'team2'; // Who started with the disk
  possessionType: 'hold' | 'break'; // scoringTeam === offensiveTeam ? hold : break
}

/**
 * Computes point-by-point events from unified game events array.
 * Events are already in chronological order, so we just group turnovers between goals.
 */
export function computePointByPointEvents(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
): PointEvents[] {
  const result: PointEvents[] = [];
  let currentTurnovers: DisplayTurnover[] = [];
  let pointNumber = 0;
  let team1Score = 0;
  let team2Score = 0;

  // Calculate halftime score
  const halftimeScore = Math.ceil(gameTo / 2);
  let hasReachedHalftime = false;

  // Track who is ON OFFENSE (receiving the pull) for the current point
  let currentOffensiveTeam: 'team1' | 'team2' = startingPossession || 'team1';

  for (const event of events) {
    if (event.type === 'turnover') {
      // Collect turnovers for the current point
      currentTurnovers.push({
        team: event.team,
        type: event.subtype,
        playerId: event.playerId,
        player2Id: event.player2Id,
      });
    } else if (event.type === 'goal') {
      pointNumber++;

      // Determine possession type for THIS point
      const possessionType = event.team === currentOffensiveTeam ? 'hold' : 'break';
      const offensiveTeamForThisPoint = currentOffensiveTeam;

      // Update score
      if (event.team === 'team1') {
        team1Score++;
      } else {
        team2Score++;
      }

      // Record the point
      result.push({
        pointNumber,
        scoringTeam: event.team,
        scoreAfter: { team1: team1Score, team2: team2Score },
        goalPlayerId: event.goalPlayerId,
        assistPlayerId: event.assistPlayerId,
        turnovers: currentTurnovers,
        offensiveTeam: offensiveTeamForThisPoint,
        possessionType,
      });

      // Reset turnovers for next point
      currentTurnovers = [];

      // Update offensive team for NEXT point
      if (!hasReachedHalftime && (team1Score === halftimeScore || team2Score === halftimeScore)) {
        // Halftime reached! The team that started on defense receives to start 2nd half.
        currentOffensiveTeam = startingPossession === 'team1' ? 'team2' : 'team1';
        hasReachedHalftime = true;
      } else {
        // Normal point: Scoring team pulls -> other team becomes offense
        currentOffensiveTeam = event.team === 'team1' ? 'team2' : 'team1';
      }
    }
  }

  return result;
}

/**
 * Get total turnovers by type
 */
export function getTurnoverSummary(turnovers: DisplayTurnover[]) {
  return {
    blocks: turnovers.filter((t) => t.type === 'block').length,
    throwaways: turnovers.filter((t) => t.type === 'throwaway' || t.type === 'fiftyfifty').length,
    drops: turnovers.filter((t) => t.type === 'drop').length,
  };
}
