import * as Sentry from '@sentry/react-native';

import type { AdvancedTrackedGame, PossessionAction } from './types';

type PointDiagnostic = {
  index: number;
  id: string;
  startedAt?: number;
  possessionCount: number;
  lastAction?: { kind: PossessionAction['kind']; result?: string; recordedAt?: number };
  lastNonStoppageAction?: {
    kind: PossessionAction['kind'];
    result?: string;
    recordedAt?: number;
  };
};

type AdvancedGameDiagnostic = {
  gameId: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  status: AdvancedTrackedGame['status'];
  gameType: AdvancedTrackedGame['gameType'];
  pointCount: number;
  currentPointId?: string;
  pointSummaries: PointDiagnostic[];
  pointSummaryTruncated: boolean;
  transitions?: {
    type: string;
    afterPointId?: string;
    triggeredEarly?: boolean;
  }[];
};

function summarizeAction(action: PossessionAction | undefined) {
  if (action == null) return undefined;
  return {
    kind: action.kind,
    ...(action.kind === 'pull' || action.kind === 'throw' ? { result: action.result } : {}),
    ...(action.recordedAt != null ? { recordedAt: action.recordedAt } : {}),
  };
}

function getAdvancedGameDiagnostic(game: AdvancedTrackedGame): AdvancedGameDiagnostic {
  const maxPointSummaries = 100;

  return {
    gameId: game.id,
    schemaVersion: game.schemaVersion,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    status: game.status,
    gameType: game.gameType,
    pointCount: game.points.length,
    currentPointId: game.points.at(-1)?.id,
    pointSummaries: game.points.slice(0, maxPointSummaries).map((point, index) => {
      const actions = point.possessions.flatMap((possession) => possession.actions);
      const nonStoppageActions = actions.filter((action) => action.kind !== 'stoppage');
      return {
        index,
        id: point.id,
        ...(point.startedAt != null ? { startedAt: point.startedAt } : {}),
        possessionCount: point.possessions.length,
        lastAction: summarizeAction(actions.at(-1)),
        lastNonStoppageAction: summarizeAction(nonStoppageActions.at(-1)),
      };
    }),
    pointSummaryTruncated: game.points.length > maxPointSummaries,
    ...(game.gameTransitions != null
      ? {
          transitions: game.gameTransitions.map((transition) => ({
            type: transition.transitionType,
            afterPointId: transition.afterPointId,
            ...(transition.transitionType === 'halftime' && transition.triggeredEarly === true
              ? { triggeredEarly: true }
              : {}),
          })),
        }
      : {}),
  };
}

/**
 * Adds structural game state to the breadcrumb trail consumed by the Sentry error boundary.
 * Do not include participants, labels, metadata, notes, or raw actions here.
 */
export function recordAdvancedGameDiagnostic(game: AdvancedTrackedGame, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  Sentry.addBreadcrumb({
    category: 'advanced-game.diagnostic',
    level: 'error',
    message,
    data: getAdvancedGameDiagnostic(game),
  });
}
