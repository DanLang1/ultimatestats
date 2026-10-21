import { ATTRIBUTION_STAT_SPECS } from './advancedPlayerStatsUtils';
import {
  SPLIT_ATTRIBUTION_WEIGHT,
  type AnalyticsGame,
  type AnalyticsPoint,
  type AttributionType,
} from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';

export interface AdvancedImpactPoint {
  pointIndex: number;
  onField: boolean;
  state: 'hold' | 'break' | 'broken' | 'opp_hold' | 'terminated' | 'in_progress' | null;
  plusMinusDelta: number;
  cumulativePlusMinus: number;
  /** The participant's impact events this point, in display order; empty when none. */
  parts: ImpactPart[];
  score: string;
}

export type ImpactPartCode =
  | 'C'
  | 'GA'
  | 'G'
  | 'A'
  | 'HA'
  | 'B'
  | 'P'
  | 'Stl'
  | 'StlC'
  | 'T'
  | 'D'
  | 'FfT'
  | 'FfD'
  | 'FfS';

export interface ImpactPart {
  code: ImpactPartCode;
  count: number;
  /** This part's contribution to the point's plus/minus delta. */
  plusMinus: number;
}

interface PointImpactAttributions {
  totals: Map<AttributionType, number>;
  splitByActionId: Map<string, Set<'throwaway' | 'drop'>>;
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
    const parts = onField ? getImpactParts(pointAttribs.get(point.id)) : [];
    const plusMinusDelta = parts.reduce((total, part) => total + part.plusMinus, 0);

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
      parts,
      score,
    });
  }

  return result;
}

function buildParticipantAttributions(
  game: AnalyticsGame,
  participantId: string,
  participantSideId?: string,
): Map<string, PointImpactAttributions> {
  const pointById = new Map(game.points.map((point) => [point.id, point]));
  const pointAttribs = new Map<string, PointImpactAttributions>();
  for (const attr of game.attributions) {
    if (attr.participantId !== participantId) continue;
    if (
      participantSideId != null &&
      !pointById.get(attr.pointId)?.linesBySide[participantSideId]?.includes(participantId)
    ) {
      continue;
    }
    const summary = pointAttribs.get(attr.pointId) ?? {
      totals: new Map<AttributionType, number>(),
      splitByActionId: new Map<string, Set<'throwaway' | 'drop'>>(),
    };
    summary.totals.set(attr.type, (summary.totals.get(attr.type) ?? 0) + attr.weight);

    if (attr.splitAttribution && (attr.type === 'throwaway' || attr.type === 'drop')) {
      const splitTypes =
        summary.splitByActionId.get(attr.actionId) ?? new Set<'throwaway' | 'drop'>();
      splitTypes.add(attr.type);
      summary.splitByActionId.set(attr.actionId, splitTypes);
    }
    pointAttribs.set(attr.pointId, summary);
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

function getImpactParts(summary?: PointImpactAttributions): ImpactPart[] {
  if (!summary) return [];
  const get = (type: AttributionType) => summary.totals.get(type) ?? 0;
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
  // A Callahan is also attributed as a goal and a block; credit both to the Callahan part.
  const nonCallahanGoals = Math.max(0, goals - callahans);
  const nonCallahanBlocks = Math.max(0, blocks - callahans);
  let splitThrowaways = 0;
  let splitDrops = 0;
  let splitSelf = 0;
  for (const splitTypes of summary.splitByActionId.values()) {
    if (splitTypes.has('throwaway') && splitTypes.has('drop')) splitSelf++;
    else if (splitTypes.has('throwaway')) splitThrowaways++;
    else if (splitTypes.has('drop')) splitDrops++;
  }
  // Split 50/50 attributions carry half weight in the throwaway/drop totals.
  const fullThrowaways = throwaways - (splitThrowaways + splitSelf) * SPLIT_ATTRIBUTION_WEIGHT;
  const fullDrops = drops - (splitDrops + splitSelf) * SPLIT_ATTRIBUTION_WEIGHT;

  const weight = (type: AttributionType) => ATTRIBUTION_STAT_SPECS[type].plusMinusWeight;
  const parts: ImpactPart[] = [];
  addPart(parts, 'C', callahans, callahans * (weight('goal') + weight('block')));
  if (nonCallahanGoals > 0 && assists > 0) {
    parts.push({
      code: 'GA',
      count: 1,
      plusMinus: nonCallahanGoals * weight('goal') + assists * weight('assist'),
    });
  } else {
    addPart(parts, 'G', nonCallahanGoals, nonCallahanGoals * weight('goal'));
    addPart(parts, 'A', assists, assists * weight('assist'));
  }
  addPart(parts, 'HA', hockeyAssists, hockeyAssists * weight('hockey_assist'));
  addPart(parts, 'B', nonCallahanBlocks, nonCallahanBlocks * weight('block'));
  addPart(parts, 'P', pressures, pressures * weight('pressure'));
  addPart(parts, 'Stl', stalls, stalls * weight('stall'));
  addPart(parts, 'StlC', stallsConceded, stallsConceded * weight('stall_conceded'));
  addPart(parts, 'T', fullThrowaways, fullThrowaways * weight('throwaway'));
  addPart(parts, 'D', fullDrops, fullDrops * weight('drop'));
  // Each half of a 50/50 carries half weight; a self 50/50 carries both halves.
  addPart(
    parts,
    'FfT',
    splitThrowaways,
    splitThrowaways * SPLIT_ATTRIBUTION_WEIGHT * weight('throwaway'),
  );
  addPart(parts, 'FfD', splitDrops, splitDrops * SPLIT_ATTRIBUTION_WEIGHT * weight('drop'));
  addPart(
    parts,
    'FfS',
    splitSelf,
    splitSelf * SPLIT_ATTRIBUTION_WEIGHT * (weight('throwaway') + weight('drop')),
  );
  return parts;
}

function addPart(parts: ImpactPart[], code: ImpactPartCode, count: number, plusMinus: number) {
  if (count <= 0) return;
  parts.push({ code, count, plusMinus });
}

/**
 * The part that drove a point's net delta: the largest gain when the point is net positive, the
 * largest loss when net negative, otherwise the first part. `null` when the point has no parts.
 */
export function getImpactDrivingPart(
  parts: ImpactPart[],
  plusMinusDelta: number,
): ImpactPart | null {
  if (parts.length === 0) return null;

  let driver = parts[0];
  for (const part of parts) {
    if (plusMinusDelta > 0 && part.plusMinus > driver.plusMinus) driver = part;
    if (plusMinusDelta < 0 && part.plusMinus < driver.plusMinus) driver = part;
  }
  return driver;
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
