import type {
  AnalyticsAction,
  AnalyticsGame,
  AnalyticsPossession,
} from '@/lib/advancedTracking/analyticsTypes';
import type { TimeOfPossessionStats } from '@/lib/timeOfPossessionTypes';

function getPossessionEndingAction(
  possession: AnalyticsPossession,
  actionsByPossessionId: Map<string, AnalyticsAction[]>,
): AnalyticsAction | undefined {
  const actions = actionsByPossessionId.get(possession.id);
  if (!actions) return undefined;
  return actions.findLast((action) => action.kind !== 'stoppage');
}

export function computeAdvancedTimeOfPossessionStats(
  game: AnalyticsGame,
  team1SideId: string,
  team2SideId: string,
): TimeOfPossessionStats {
  const actionsByPossessionId = new Map<string, AnalyticsAction[]>();
  for (const action of game.actions) {
    const actions = actionsByPossessionId.get(action.possessionId) ?? [];
    actions.push(action);
    actionsByPossessionId.set(action.possessionId, actions);
  }

  let team1TotalMs = 0;
  let team2TotalMs = 0;
  let timedPointCount = 0;

  for (const point of game.points) {
    if (point.scoringSideId == null || point.durationMs == null) continue;

    const pointPossessions = game.possessions
      .filter((possession) => possession.pointId === point.id)
      .sort((a, b) => a.possessionIndex - b.possessionIndex);

    if (pointPossessions.length === 0) continue;

    let previousElapsedMs = 0;
    let team1PointMs = 0;
    let team2PointMs = 0;
    let validPoint = true;

    for (const possession of pointPossessions) {
      const endingAction = getPossessionEndingAction(possession, actionsByPossessionId);
      if (endingAction?.elapsedMs == null) {
        validPoint = false;
        break;
      }

      const segmentMs = endingAction.elapsedMs - previousElapsedMs;
      if (segmentMs < 0) {
        validPoint = false;
        break;
      }

      if (possession.sideId === team1SideId) {
        team1PointMs += segmentMs;
      } else if (possession.sideId === team2SideId) {
        team2PointMs += segmentMs;
      } else {
        validPoint = false;
        break;
      }

      previousElapsedMs = endingAction.elapsedMs;
    }

    if (!validPoint) continue;

    team1TotalMs += team1PointMs;
    team2TotalMs += team2PointMs;
    timedPointCount++;
  }

  const totalMs = team1TotalMs + team2TotalMs;
  const hasTopData = timedPointCount > 0;

  return {
    hasTopData,
    team1TotalPossessionMs: team1TotalMs,
    team2TotalPossessionMs: team2TotalMs,
    team1PossessionPct: totalMs > 0 ? (team1TotalMs / totalMs) * 100 : 50,
    team2PossessionPct: totalMs > 0 ? (team2TotalMs / totalMs) * 100 : 50,
    timedPointCount,
  };
}
