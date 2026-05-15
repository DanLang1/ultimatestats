import type { AnalyticsGame, AttributionType } from './analyticsTypes';

export interface AdvancedImpactPoint {
  pointIndex: number;
  onField: boolean;
  state: 'hold' | 'break' | 'broken' | 'opp_hold' | 'terminated' | 'in_progress' | null;
  plusMinusDelta: number;
  cumulativePlusMinus: number;
  description: string;
  score: string;
}

export function computeAdvancedImpact(
  game: AnalyticsGame,
  participantId: string,
  focusSideId: string,
): AdvancedImpactPoint[] {
  // Build per-point attribution map: pointId → type → count
  const pointAttribs = new Map<string, Map<AttributionType, number>>();
  for (const attr of game.attributions) {
    if (attr.participantId !== participantId) continue;
    let typeMap = pointAttribs.get(attr.pointId);
    if (!typeMap) {
      typeMap = new Map();
      pointAttribs.set(attr.pointId, typeMap);
    }
    typeMap.set(attr.type, (typeMap.get(attr.type) ?? 0) + attr.weight);
  }

  // Track focus side score separately since scoresBySide is start-of-point
  let cumulativePlusMinus = 0;
  const result: AdvancedImpactPoint[] = [];

  for (const point of game.points) {
    const onField = (point.linesBySide[focusSideId] ?? []).includes(participantId);
    const typeMap = pointAttribs.get(point.id);

    let plusMinusDelta = 0;
    const parts: string[] = [];

    if (onField && typeMap) {
      const get = (t: AttributionType) => typeMap.get(t) ?? 0;

      const goals = get('goal');
      const assists = get('assist');
      const ha = get('hockey_assist');
      const blocks = get('block');
      const callahans = get('callahan');
      const throwaways = get('throwaway');
      const drops = get('drop');
      const stalls = get('stall');
      const stallsConceded = get('stall_conceded');

      plusMinusDelta =
        goals + assists + blocks + stalls + callahans - throwaways - drops - stallsConceded;

      if (goals > 0 && assists > 0) parts.push('GA');
      else {
        if (goals > 0) parts.push(goals > 1 ? `${goals}G` : 'G');
        if (assists > 0) parts.push(assists > 1 ? `${assists}A` : 'A');
      }
      if (ha > 0) parts.push(ha > 1 ? `${ha}HA` : 'HA');
      if (callahans > 0) parts.push('C');
      if (blocks > 0) parts.push(blocks > 1 ? `${blocks}B` : 'B');
      if (stalls > 0) parts.push(stalls > 1 ? `${stalls}Stl` : 'Stl');
      if (stallsConceded > 0) parts.push(stallsConceded > 1 ? `${stallsConceded}StlC` : 'StlC');
      if (throwaways > 0) parts.push(throwaways > 1 ? `${throwaways}T` : 'T');
      if (drops > 0) parts.push(drops > 1 ? `${drops}D` : 'D');
    }

    cumulativePlusMinus += plusMinusDelta;

    // Derive post-point score for focus side
    const startScore = point.scoresBySide[focusSideId] ?? 0;
    const focusScored = point.scoringSideId === focusSideId ? 1 : 0;
    const focusScore = startScore + focusScored;

    const oppSideId = Object.keys(point.scoresBySide).find((id) => id !== focusSideId);
    const oppStartScore = oppSideId ? (point.scoresBySide[oppSideId] ?? 0) : 0;
    const oppScored = oppSideId && point.scoringSideId === oppSideId ? 1 : 0;
    const oppScore = oppStartScore + oppScored;

    result.push({
      pointIndex: point.pointIndex,
      onField,
      state: point.state ?? null,
      plusMinusDelta,
      cumulativePlusMinus,
      description: parts.join(', '),
      score: `${focusScore}-${oppScore}`,
    });
  }

  return result;
}
