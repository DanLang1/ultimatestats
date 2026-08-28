import type { AnalyticsGame, AnalyticsPoint, AttributionType } from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';
import { PRESSURE_PLUS_MINUS_VALUE } from './statConstants';

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
  participantSideId?: string,
): AdvancedImpactPoint[] {
  const pointAttribs = buildParticipantAttributions(game, participantId, participantSideId);
  let cumulativePlusMinus = 0;
  const result: AdvancedImpactPoint[] = [];

  for (const point of game.points) {
    const pointParticipantSideId = findParticipantSide(point, participantId);
    const perspectiveSideId = participantSideId ?? pointParticipantSideId ?? focusSideId;
    const onField = isParticipantOnField(pointParticipantSideId, participantSideId);
    const { plusMinusDelta, description } = onField
      ? getImpactSummary(pointAttribs.get(point.id))
      : { plusMinusDelta: 0, description: '' };

    cumulativePlusMinus += plusMinusDelta;
    const score = getImpactScore(point, perspectiveSideId);

    result.push({
      pointIndex: point.pointIndex,
      onField,
      state:
        onField && pointParticipantSideId != null
          ? getPointStateForSide(point, pointParticipantSideId)
          : (point.state ?? null),
      plusMinusDelta,
      cumulativePlusMinus,
      description,
      score,
    });
  }

  return result;
}

function buildParticipantAttributions(
  game: AnalyticsGame,
  participantId: string,
  participantSideId?: string,
): Map<string, Map<AttributionType, number>> {
  const pointById = new Map(game.points.map((point) => [point.id, point]));
  const pointAttribs = new Map<string, Map<AttributionType, number>>();
  for (const attr of game.attributions) {
    if (attr.participantId !== participantId) continue;
    if (
      participantSideId != null &&
      !pointById.get(attr.pointId)?.linesBySide[participantSideId]?.includes(participantId)
    ) {
      continue;
    }
    const typeMap = pointAttribs.get(attr.pointId) ?? new Map<AttributionType, number>();
    typeMap.set(attr.type, (typeMap.get(attr.type) ?? 0) + attr.weight);
    pointAttribs.set(attr.pointId, typeMap);
  }
  return pointAttribs;
}

function findParticipantSide(point: AnalyticsPoint, participantId: string): string | undefined {
  return Object.entries(point.linesBySide).find(([, participantIds]) =>
    participantIds.includes(participantId),
  )?.[0];
}

function isParticipantOnField(
  participantSideId: string | undefined,
  requestedSideId: string | undefined,
): boolean {
  return (
    participantSideId != null && (requestedSideId == null || participantSideId === requestedSideId)
  );
}

function getImpactSummary(typeMap?: Map<AttributionType, number>): {
  plusMinusDelta: number;
  description: string;
} {
  if (!typeMap) return { plusMinusDelta: 0, description: '' };
  const get = (type: AttributionType) => typeMap.get(type) ?? 0;
  const goals = get('goal');
  const assists = get('assist');
  const hockeyAssists = get('hockey_assist');
  const blocks = get('block');
  const pressures = get('pressure');
  const callahans = get('callahan');
  const throwaways = get('throwaway');
  const drops = get('drop');
  const stalls = get('stall');
  const stallsConceded = get('stall_conceded');
  const nonCallahanGoals = Math.max(0, goals - callahans);
  const nonCallahanBlocks = Math.max(0, blocks - callahans);
  const parts: string[] = [];

  if (callahans > 0) parts.push('C');
  if (nonCallahanGoals > 0 && assists > 0) parts.push('GA');
  else {
    addCountLabel(parts, nonCallahanGoals, 'G');
    addCountLabel(parts, assists, 'A');
  }
  addCountLabel(parts, hockeyAssists, 'HA');
  addCountLabel(parts, nonCallahanBlocks, 'B');
  addCountLabel(parts, pressures, 'P');
  addCountLabel(parts, stalls, 'Stl');
  addCountLabel(parts, stallsConceded, 'StlC');
  addCountLabel(parts, throwaways, 'T');
  addCountLabel(parts, drops, 'D');

  return {
    plusMinusDelta:
      goals +
      assists +
      blocks +
      pressures * PRESSURE_PLUS_MINUS_VALUE +
      stalls -
      throwaways -
      drops -
      stallsConceded,
    description: parts.join(', '),
  };
}

function addCountLabel(parts: string[], count: number, suffix: string): void {
  if (count <= 0) return;
  parts.push(count > 1 ? `${count}${suffix}` : suffix);
}

function getImpactScore(point: AnalyticsPoint, perspectiveSideId: string): string {
  const startScore = point.scoresBySide[perspectiveSideId] ?? 0;
  const ownScore = startScore + (point.scoringSideId === perspectiveSideId ? 1 : 0);
  const opposingSideId = Object.keys(point.scoresBySide).find((id) => id !== perspectiveSideId);
  const opposingStartScore = opposingSideId ? (point.scoresBySide[opposingSideId] ?? 0) : 0;
  const opposingScore =
    opposingStartScore + (opposingSideId && point.scoringSideId === opposingSideId ? 1 : 0);
  return `${ownScore}-${opposingScore}`;
}
