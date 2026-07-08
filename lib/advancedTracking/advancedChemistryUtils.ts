import type { AnalyticsGame } from './analyticsTypes';

export type AdvancedChemistryMode = 'scoring' | 'passing';

export interface AdvancedChemistryConnection {
  participantId: string;
  participantName: string;
  goalsFrom: number;
  assistsTo: number;
  totalConnections: number;
}

export interface AdvancedPassConnection {
  participantId: string;
  participantName: string;
  caughtFrom: number;
  threwTo: number;
  totalPasses: number;
}

export function getVisibleAdvancedChemistryMode(
  requestedMode: AdvancedChemistryMode,
  hasChemistry: boolean,
  hasPassConnections: boolean,
): AdvancedChemistryMode {
  if (requestedMode === 'scoring' && !hasChemistry && hasPassConnections) {
    return 'passing';
  }
  if (requestedMode === 'passing' && !hasPassConnections && hasChemistry) {
    return 'scoring';
  }
  return requestedMode;
}

/**
 * Derives chemistry connections from analytics attributions.
 * Groups by actionId to pair assister + scorer on each goal action.
 */
export function computeAdvancedChemistry(
  game: AnalyticsGame,
  participantId: string,
  participantNames: Map<string, string>,
): AdvancedChemistryConnection[] {
  const byAction = new Map<string, { goalId: string | null; assistId: string | null }>();

  for (const attr of game.attributions) {
    if (attr.type !== 'goal' && attr.type !== 'assist') continue;
    const entry = byAction.get(attr.actionId) ?? { goalId: null, assistId: null };
    if (attr.type === 'goal') {
      entry.goalId = attr.participantId;
    } else {
      entry.assistId = attr.participantId;
    }
    byAction.set(attr.actionId, entry);
  }

  const connections = new Map<string, { goalsFrom: number; assistsTo: number }>();

  for (const { goalId, assistId } of byAction.values()) {
    if (!goalId || !assistId) continue;

    if (goalId === participantId && assistId !== participantId) {
      const conn = connections.get(assistId) ?? { goalsFrom: 0, assistsTo: 0 };
      conn.goalsFrom++;
      connections.set(assistId, conn);
    }

    if (assistId === participantId && goalId !== participantId) {
      const conn = connections.get(goalId) ?? { goalsFrom: 0, assistsTo: 0 };
      conn.assistsTo++;
      connections.set(goalId, conn);
    }
  }

  return Array.from(connections.entries())
    .filter(([, { goalsFrom, assistsTo }]) => goalsFrom > 0 || assistsTo > 0)
    .map(([id, { goalsFrom, assistsTo }]) => ({
      participantId: id,
      participantName: participantNames.get(id) ?? id,
      goalsFrom,
      assistsTo,
      totalConnections: goalsFrom + assistsTo,
    }))
    .sort((a, b) => b.totalConnections - a.totalConnections);
}

/**
 * Derives player-to-player completed pass connections from analytics actions.
 * Counts completed throws and goal throws only; attempted but incomplete throws are
 * intentionally excluded from this first-pass possession chemistry view.
 */
export function computeAdvancedPassConnections(
  game: AnalyticsGame,
  participantId: string,
  participantNames: Map<string, string>,
): AdvancedPassConnection[] {
  const connections = new Map<string, { caughtFrom: number; threwTo: number }>();

  for (const action of game.actions) {
    if (action.kind !== 'throw') continue;
    if (action.result !== 'complete' && action.result !== 'goal') continue;
    if (!action.actorId || !action.receiverId) continue;
    if (!participantNames.has(action.actorId) || !participantNames.has(action.receiverId)) continue;
    if (action.actorId === action.receiverId) continue;

    if (action.receiverId === participantId) {
      const conn = connections.get(action.actorId) ?? { caughtFrom: 0, threwTo: 0 };
      conn.caughtFrom++;
      connections.set(action.actorId, conn);
    }

    if (action.actorId === participantId) {
      const conn = connections.get(action.receiverId) ?? { caughtFrom: 0, threwTo: 0 };
      conn.threwTo++;
      connections.set(action.receiverId, conn);
    }
  }

  return Array.from(connections.entries())
    .filter(([, { caughtFrom, threwTo }]) => caughtFrom > 0 || threwTo > 0)
    .map(([id, { caughtFrom, threwTo }]) => ({
      participantId: id,
      participantName: participantNames.get(id) ?? id,
      caughtFrom,
      threwTo,
      totalPasses: caughtFrom + threwTo,
    }))
    .sort((a, b) => b.totalPasses - a.totalPasses);
}
