import type { AnalyticsGame } from './analyticsTypes';

export interface AdvancedChemistryConnection {
  participantId: string;
  participantName: string;
  goalsFrom: number;
  assistsTo: number;
  totalConnections: number;
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
