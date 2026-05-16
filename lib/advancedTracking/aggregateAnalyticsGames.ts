import type {
  AnalyticsAction,
  AnalyticsAttribution,
  AnalyticsGame,
  AnalyticsPoint,
  AnalyticsPossession,
} from './analyticsTypes';

function prefixId(gameIndex: number, id: string) {
  return `g${gameIndex}_${id}`;
}

function aggregateSideLabels(games: AnalyticsGame[], focusSideId: string) {
  const labels: Record<string, string> = {
    [focusSideId]: games[0]?.sideLabels[focusSideId] ?? 'My Team',
  };

  for (const [gameIndex, game] of games.entries()) {
    for (const [sideId, label] of Object.entries(game.sideLabels)) {
      if (sideId === focusSideId) continue;
      labels[prefixId(gameIndex, sideId)] = label;
    }
  }

  return labels;
}

function remapSideId(gameIndex: number, focusSideId: string, sideId: string) {
  if (sideId === focusSideId) return sideId;
  return prefixId(gameIndex, sideId);
}

function remapScoresBySide(
  gameIndex: number,
  focusSideId: string,
  scoresBySide: Record<string, number>,
) {
  return Object.fromEntries(
    Object.entries(scoresBySide).map(([sideId, score]) => [
      remapSideId(gameIndex, focusSideId, sideId),
      score,
    ]),
  );
}

function remapLinesBySide(
  gameIndex: number,
  focusSideId: string,
  linesBySide: Record<string, string[]>,
) {
  return Object.fromEntries(
    Object.entries(linesBySide).map(([sideId, participantIds]) => [
      remapSideId(gameIndex, focusSideId, sideId),
      participantIds,
    ]),
  );
}

function aggregatePoint(
  point: AnalyticsPoint,
  gameIndex: number,
  pointIndex: number,
  focusSideId: string,
): AnalyticsPoint {
  return {
    ...point,
    id: prefixId(gameIndex, point.id),
    pointIndex,
    receivingSideId: remapSideId(gameIndex, focusSideId, point.receivingSideId),
    pullingSideId: remapSideId(gameIndex, focusSideId, point.pullingSideId),
    scoringSideId:
      point.scoringSideId == null ? null : remapSideId(gameIndex, focusSideId, point.scoringSideId),
    linesBySide: remapLinesBySide(gameIndex, focusSideId, point.linesBySide),
    scoresBySide: remapScoresBySide(gameIndex, focusSideId, point.scoresBySide),
  };
}

function aggregatePossession(
  possession: AnalyticsPossession,
  gameIndex: number,
  pointIndex: number,
  focusSideId: string,
): AnalyticsPossession {
  return {
    ...possession,
    id: prefixId(gameIndex, possession.id),
    pointId: prefixId(gameIndex, possession.pointId),
    pointIndex,
    sideId: remapSideId(gameIndex, focusSideId, possession.sideId),
  };
}

function aggregateAction(
  action: AnalyticsAction,
  gameIndex: number,
  pointIndex: number,
  focusSideId: string,
): AnalyticsAction {
  return {
    ...action,
    id: prefixId(gameIndex, action.id),
    pointId: prefixId(gameIndex, action.pointId),
    pointIndex,
    possessionId: prefixId(gameIndex, action.possessionId),
    sideId: remapSideId(gameIndex, focusSideId, action.sideId),
    previousActionId:
      action.previousActionId == null ? null : prefixId(gameIndex, action.previousActionId),
  };
}

function aggregateAttribution(
  attribution: AnalyticsAttribution,
  gameIndex: number,
): AnalyticsAttribution {
  return {
    ...attribution,
    actionId: prefixId(gameIndex, attribution.actionId),
    pointId: prefixId(gameIndex, attribution.pointId),
  };
}

export function aggregateAnalyticsGames(games: AnalyticsGame[]): AnalyticsGame | null {
  if (games.length === 0) return null;

  const firstGame = games[0];
  const focusSideId = firstGame.focusSideId;

  if (games.some((game) => game.focusSideId !== focusSideId)) {
    throw new Error('aggregateAnalyticsGames requires games with the same focus side.');
  }

  const points: AnalyticsPoint[] = [];
  const possessions: AnalyticsPossession[] = [];
  const actions: AnalyticsAction[] = [];
  const attributions: AnalyticsAttribution[] = [];
  const participantNames = new Map<string, string>();

  for (const game of games) {
    for (const [participantId, name] of game.participantNames.entries()) {
      participantNames.set(participantId, name);
    }
  }

  for (const [gameIndex, game] of games.entries()) {
    const pointIndexByOriginalId = new Map<string, number>();

    for (const point of game.points) {
      const aggregatePointIndex = points.length;
      pointIndexByOriginalId.set(point.id, aggregatePointIndex);
      points.push(aggregatePoint(point, gameIndex, aggregatePointIndex, focusSideId));
    }

    for (const possession of game.possessions) {
      const pointIndex = pointIndexByOriginalId.get(possession.pointId) ?? possession.pointIndex;
      possessions.push(aggregatePossession(possession, gameIndex, pointIndex, focusSideId));
    }

    for (const action of game.actions) {
      const pointIndex = pointIndexByOriginalId.get(action.pointId) ?? action.pointIndex;
      actions.push(aggregateAction(action, gameIndex, pointIndex, focusSideId));
    }

    for (const attribution of game.attributions) {
      attributions.push(aggregateAttribution(attribution, gameIndex));
    }
  }

  return {
    gameType: firstGame.gameType,
    focusSideId,
    oppSideId: 'aggregate-opponents',
    sideLabels: aggregateSideLabels(games, focusSideId),
    participantNames,
    metadata: {
      title: `${games.length} Games Combined`,
      opponentName: 'Opponents',
    },
    createdAt: Math.min(...games.map((game) => game.createdAt)),
    points,
    possessions,
    actions,
    attributions,
  };
}
