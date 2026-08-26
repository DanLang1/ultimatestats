import type { GenderRatio } from '@/lib/genderRatioUtils';

import type {
  AnalyticsAction,
  AnalyticsGame,
  AnalyticsPoint,
  AnalyticsPossession,
  DiscPickupAnalyticsAction,
  PointState,
  PullAnalyticsAction,
  StoppageAnalyticsAction,
  ThrowAnalyticsAction,
} from './analyticsTypes';
import { buildAnalyticsGame, UNKNOWN_PARTICIPANT_ID } from './buildAnalyticsGame';
import { getEffectiveLineParticipantIds } from './trackingUtils';
import type {
  AdvancedTrackedGame,
  BetweenPointTransition,
  GameTransition,
  PointSub,
  PossessionAction,
  PullResult,
  ThrowResult,
  ThrowType,
  TrackedPoint,
} from './types';

export type ActionTone = 'success' | 'danger' | 'warning' | 'muted' | 'accent';

export interface AdvancedTimelinePoint {
  pointId: string;
  pointNumber: number;
  half: 1 | 2;
  scoreBefore: Record<string, number>;
  scoreAfter: Record<string, number>;
  receivingSideId: string;
  pullingSideId: string;
  scoringSideId: string | null;
  state: PointState;
  durationMs: number | null;
  genderRatio?: GenderRatio;
  linesBySide: Record<string, AdvancedTimelineLinePlayer[]>;
  possessions: AdvancedTimelinePossession[];
  subs: AdvancedTimelineSub[];
  transitionsAfter: BetweenPointTransition[];
  gameTransitionsAfter: GameTransition[];
  note?: string;
}

export interface AdvancedTimelineLinePlayer {
  participantId: string;
  name: string;
  isActiveAtEnd: boolean;
}

export interface AdvancedTimelinePossession {
  possessionId: string;
  sideId: string;
  result: AnalyticsPossession['result'];
  turnoverType?: AnalyticsPossession['turnoverType'];
  actions: AdvancedTimelineAction[];
}

export interface AdvancedTimelineActionBase {
  id: string;
  kind: AnalyticsAction['kind'];
  sideId: string;
  elapsedMs: number | null;
  primaryLabel: string;
  secondaryLabel: string | null;
  tone: ActionTone;
}

export interface PullDisplayAction extends AdvancedTimelineActionBase {
  kind: 'pull';
  pullResult: PullResult;
  hangTimeMs?: number;
  pullerName: string;
}

export interface PickupDisplayAction extends AdvancedTimelineActionBase {
  kind: 'disc_pickup';
  playerName: string;
}

export interface ThrowDisplayAction extends AdvancedTimelineActionBase {
  kind: 'throw';
  throwResult: ThrowResult;
  throwerName: string;
  receiverName: string | null;
  defenderName: string | null;
  splitAttribution: boolean;
  throwType?: ThrowType;
}

export interface StoppageDisplayAction extends AdvancedTimelineActionBase {
  kind: 'stoppage';
  reason: 'timeout' | 'injury' | 'manual_pause';
  isFloater?: boolean;
  resumed: boolean;
}

export type AdvancedTimelineAction =
  | PullDisplayAction
  | PickupDisplayAction
  | ThrowDisplayAction
  | StoppageDisplayAction;

export interface AdvancedTimelineSub {
  sideId: string;
  inIds: string[];
  outIds: string[];
  stoppageActionId: string;
  inNames: string[];
  outNames: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveName(
  participantNames: Map<string, string>,
  participantId: string | null,
): string | null {
  if (participantId === null) return null;
  if (participantId === UNKNOWN_PARTICIPANT_ID) return 'Unknown';
  return participantNames.get(participantId) ?? participantId;
}

function buildLinesBySide(
  analyticsPoint: AnalyticsPoint,
  rawPoint: TrackedPoint,
  participantNames: Map<string, string>,
): Record<string, AdvancedTimelineLinePlayer[]> {
  const result: Record<string, AdvancedTimelineLinePlayer[]> = {};

  for (const [sideId, participantIds] of Object.entries(analyticsPoint.linesBySide)) {
    const activeParticipantIds = new Set(getEffectiveLineParticipantIds(rawPoint, sideId));

    result[sideId] = participantIds.map((pid) => ({
      participantId: pid,
      name: resolveName(participantNames, pid) ?? pid,
      isActiveAtEnd: activeParticipantIds.has(pid),
    }));
  }

  return result;
}

function buildSubs(
  rawSubs: PointSub[],
  participantNames: Map<string, string>,
): AdvancedTimelineSub[] {
  return rawSubs.map((sub) => ({
    sideId: sub.sideId,
    inIds: sub.inIds,
    outIds: sub.outIds,
    stoppageActionId: sub.stoppageActionId,
    inNames: sub.inIds.map((id) => resolveName(participantNames, id) ?? 'Unknown'),
    outNames: sub.outIds.map((id) => resolveName(participantNames, id) ?? 'Unknown'),
  }));
}

function getThrowTone(
  throwResult: ThrowResult,
  scoringSideId: string | null,
  actionSideId: string,
  focusSideId: string,
): ActionTone {
  switch (throwResult) {
    case 'complete':
      return 'muted';
    case 'goal':
      return scoringSideId === focusSideId ? 'success' : 'danger';
    case 'drop':
      return 'danger';
    case 'throwaway':
      return 'danger';
    case 'stall':
      return actionSideId === focusSideId ? 'danger' : 'success';
    case 'block':
      return actionSideId === focusSideId ? 'danger' : 'success';
    case 'pressure':
      return actionSideId === focusSideId ? 'danger' : 'success';
    case 'callahan':
      return scoringSideId === focusSideId ? 'success' : 'danger';
  }

  throw new Error('Unsupported throw result');
}

function buildThrowLabel(
  throwResult: ThrowResult,
  throwerName: string,
  receiverName: string | null,
  defenderName: string | null,
  splitAttribution: boolean,
  focusSideId: string,
  actionSideId: string,
): { primaryLabel: string } {
  const knownThrower = throwerName !== 'Unknown';

  switch (throwResult) {
    case 'complete':
      if (knownThrower) {
        return { primaryLabel: `${throwerName} -> ${receiverName ?? '?'}` };
      }
      return { primaryLabel: receiverName ? `Unknown -> ${receiverName}` : 'Complete' };

    case 'goal':
      return {
        primaryLabel: knownThrower ? `${throwerName} + ${receiverName ?? '?'} · Goal` : 'Goal',
      };

    case 'drop':
      if (splitAttribution) {
        if (knownThrower && receiverName) {
          return { primaryLabel: `${throwerName} + ${receiverName} · 50/50` };
        }
        if (knownThrower) {
          return { primaryLabel: `${throwerName} · 50/50` };
        }
        return { primaryLabel: `${receiverName ?? '?'} · 50/50` };
      }
      return {
        primaryLabel: receiverName ? `${receiverName} · Drop` : 'Drop',
      };

    case 'throwaway':
      return {
        primaryLabel: knownThrower ? `${throwerName} · Throwaway` : 'Throwaway',
      };

    case 'stall':
      if (actionSideId === focusSideId) {
        return {
          primaryLabel: knownThrower ? `${throwerName} · Stalled` : 'Stalled',
        };
      }
      return {
        primaryLabel: defenderName ? `Stalled by ${defenderName}` : 'Stalled',
      };

    case 'block':
      if (actionSideId === focusSideId) {
        return { primaryLabel: 'Opp Block' };
      }
      return { primaryLabel: defenderName ? `${defenderName} · Block` : 'Block' };

    case 'pressure':
      if (actionSideId === focusSideId) {
        return { primaryLabel: 'OPP PRESSURE' };
      }
      return {
        primaryLabel: defenderName ? `${defenderName} · Pressure` : 'Pressure',
      };

    default: {
      const callahanScorer = defenderName ?? receiverName;
      return {
        primaryLabel: callahanScorer ? `${callahanScorer} · Callahan` : 'Callahan',
      };
    }
  }
}

// ── Action display builders ──────────────────────────────────────────────────

function actionBase(action: AnalyticsAction) {
  return {
    id: action.id,
    kind: action.kind,
    sideId: action.sideId,
    elapsedMs: action.elapsedMs,
  };
}

function buildPullDisplayAction(
  action: PullAnalyticsAction,
  base: ReturnType<typeof actionBase>,
  participantNames: Map<string, string>,
): AdvancedTimelineAction {
  const pullerName = resolveName(participantNames, action.actorId) ?? 'Unknown';
  const pullResult = action.result;
  const hangLabel =
    action.hangTimeMs != null ? `${(action.hangTimeMs / 1000).toFixed(1)}s hang` : null;

  let tone: ActionTone;
  let secondaryLabel: string | null;

  if (pullResult === 'dropped') {
    tone = 'danger';
    secondaryLabel = 'Dropped Pull';
  } else if (pullResult === 'ob') {
    tone = 'warning';
    secondaryLabel = hangLabel != null ? `OB Pull · ${hangLabel}` : 'OB Pull';
  } else if (pullResult === 'roller') {
    tone = 'muted';
    secondaryLabel = hangLabel != null ? `Roller Pull · ${hangLabel}` : 'Roller Pull';
  } else {
    tone = 'muted';
    secondaryLabel = hangLabel;
  }

  return {
    ...base,
    kind: 'pull',
    pullResult,
    hangTimeMs: action.hangTimeMs,
    pullerName,
    primaryLabel: `Pull: ${pullerName}`,
    secondaryLabel,
    tone,
  };
}

function buildPickupDisplayAction(
  action: DiscPickupAnalyticsAction,
  base: ReturnType<typeof actionBase>,
  participantNames: Map<string, string>,
): AdvancedTimelineAction {
  const playerName = resolveName(participantNames, action.actorId) ?? 'Unknown';
  return {
    ...base,
    kind: 'disc_pickup',
    playerName,
    primaryLabel: `Pickup: ${playerName}`,
    secondaryLabel: null,
    tone: 'muted',
  };
}

function buildThrowDisplayAction(
  action: ThrowAnalyticsAction,
  base: ReturnType<typeof actionBase>,
  participantNames: Map<string, string>,
  scoringSideId: string | null,
  focusSideId: string,
): AdvancedTimelineAction {
  const throwResult = action.result;

  const throwerName = resolveName(participantNames, action.actorId) ?? 'Unknown';
  const receiverName = resolveName(participantNames, action.receiverId);
  const defenderName = resolveName(participantNames, action.defenderId);
  const tone = getThrowTone(throwResult, scoringSideId, action.sideId, focusSideId);
  const secondaryLabel = getThrowTypeLabel(action.details?.type);
  const { primaryLabel } = buildThrowLabel(
    throwResult,
    throwerName,
    receiverName,
    defenderName,
    action.splitAttribution,
    focusSideId,
    action.sideId,
  );

  return {
    ...base,
    kind: 'throw',
    throwResult,
    throwerName,
    receiverName,
    defenderName,
    splitAttribution: action.splitAttribution,
    throwType: action.details?.type,
    primaryLabel,
    secondaryLabel,
    tone,
  };
}

function getThrowTypeLabel(type: ThrowType | undefined): string | null {
  if (type === 'huck') return 'Huck';
  if (type === 'backfield_reset') return 'Backfield Reset';
  return null;
}

function getStoppageDisplay(reason: string, isFloater?: boolean) {
  if (reason === 'timeout') {
    return {
      primaryLabel: isFloater ? 'Floater Timeout' : 'Timeout',
      tone: 'accent' as const,
    };
  }
  if (reason === 'injury') {
    return { primaryLabel: 'Injury', tone: 'danger' as const };
  }
  return { primaryLabel: 'Pause', tone: 'muted' as const };
}

function buildStoppageDisplayAction(
  action: StoppageAnalyticsAction,
  base: ReturnType<typeof actionBase>,
  rawActionById: Map<string, PossessionAction>,
): AdvancedTimelineAction {
  const raw = rawActionById.get(action.id);
  const rawStoppage = raw?.kind === 'stoppage' ? raw : undefined;
  const reason = rawStoppage?.reason ?? 'manual_pause';
  const isFloater = rawStoppage?.isFloater;
  const resumed = rawStoppage?.resumedAt != null;
  const { primaryLabel, tone } = getStoppageDisplay(reason, isFloater);

  return {
    ...base,
    kind: 'stoppage',
    reason,
    isFloater,
    resumed,
    primaryLabel,
    secondaryLabel: null,
    tone,
  };
}

function buildDisplayAction(
  action: AnalyticsAction,
  rawActionById: Map<string, PossessionAction>,
  participantNames: Map<string, string>,
  scoringSideId: string | null,
  focusSideId: string,
): AdvancedTimelineAction {
  const base = actionBase(action);

  if (action.kind === 'pull') {
    return buildPullDisplayAction(action, base, participantNames);
  }

  if (action.kind === 'disc_pickup') {
    return buildPickupDisplayAction(action, base, participantNames);
  }

  if (action.kind === 'throw') {
    return buildThrowDisplayAction(action, base, participantNames, scoringSideId, focusSideId);
  }

  return buildStoppageDisplayAction(action, base, rawActionById);
}

// ── Main entry point ────────────────────────────────────────────────────────

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) {
      list.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export function buildAdvancedTimeline(game: AdvancedTrackedGame): AdvancedTimelinePoint[] {
  const ctx = buildTimelineContext(game);

  return ctx.analytics.points.map((point, index) =>
    buildTimelinePoint(point, index === ctx.analytics.points.length - 1, ctx),
  );
}

// ── Timeline context ─────────────────────────────────────────────────────────

interface TimelineBuildContext {
  analytics: AnalyticsGame;
  rawPointById: Map<string, TrackedPoint>;
  rawActionById: Map<string, PossessionAction>;
  possessionsByPointId: Map<string, AnalyticsPossession[]>;
  actionsByPossessionId: Map<string, AnalyticsAction[]>;
  gameTransitionsByPointId: Map<string, GameTransition[]>;
  endTransitions: GameTransition[];
}

function buildTimelineContext(game: AdvancedTrackedGame): TimelineBuildContext {
  const analytics = buildAnalyticsGame(game);

  const rawPointById = new Map(game.points.map((p) => [p.id, p]));

  const rawActionById = new Map<string, PossessionAction>();
  for (const point of game.points) {
    for (const poss of point.possessions) {
      for (const action of poss.actions) {
        rawActionById.set(action.id, action);
      }
    }
  }

  const possessionsByPointId = groupBy(analytics.possessions, (p) => p.pointId);
  const actionsByPossessionId = groupBy(analytics.actions, (a) => a.possessionId);

  const gameTransitionsByPointId = new Map<string, GameTransition[]>();
  const endTransitions: GameTransition[] = [];

  for (const gt of game.gameTransitions ?? []) {
    if (gt.afterPointId) {
      const list = gameTransitionsByPointId.get(gt.afterPointId) ?? [];
      list.push(gt);
      gameTransitionsByPointId.set(gt.afterPointId, list);
    } else {
      endTransitions.push(gt);
    }
  }

  return {
    analytics,
    rawPointById,
    rawActionById,
    possessionsByPointId,
    actionsByPossessionId,
    gameTransitionsByPointId,
    endTransitions,
  };
}

// ── Point building ───────────────────────────────────────────────────────────

function getRequiredRawPoint(ctx: TimelineBuildContext, point: AnalyticsPoint): TrackedPoint {
  const rawPoint = ctx.rawPointById.get(point.id);
  if (!rawPoint) {
    throw new Error(`Missing raw point for analytics point "${point.id}".`);
  }
  return rawPoint;
}

function buildScoreAfter(point: AnalyticsPoint): Record<string, number> {
  const scoreAfter = { ...point.scoresBySide };
  if (point.scoringSideId != null) {
    scoreAfter[point.scoringSideId] = (scoreAfter[point.scoringSideId] ?? 0) + 1;
  }
  return scoreAfter;
}

function buildTimelinePossessions(
  point: AnalyticsPoint,
  ctx: TimelineBuildContext,
): AdvancedTimelinePossession[] {
  const possessions: AdvancedTimelinePossession[] = [];
  const pointPossessions = ctx.possessionsByPointId.get(point.id) ?? [];

  for (const poss of pointPossessions) {
    const possActions = ctx.actionsByPossessionId.get(poss.id) ?? [];
    const actions = [...possActions]
      .sort((a, b) => a.actionIndex - b.actionIndex)
      .filter(
        (a) =>
          a.kind !== 'disc_pickup' && (a.kind !== 'pull' || a.sideId === ctx.analytics.focusSideId),
      )
      .map((a) =>
        buildDisplayAction(
          a,
          ctx.rawActionById,
          ctx.analytics.participantNames,
          point.scoringSideId,
          ctx.analytics.focusSideId,
        ),
      );

    possessions.push({
      possessionId: poss.id,
      sideId: poss.sideId,
      result: poss.result,
      turnoverType: poss.turnoverType,
      actions,
    });
  }

  return possessions;
}

function buildTimelinePoint(
  point: AnalyticsPoint,
  isLastPoint: boolean,
  ctx: TimelineBuildContext,
): AdvancedTimelinePoint {
  const rawPoint = getRequiredRawPoint(ctx, point);

  const gameTransitionsAfter = [
    ...(ctx.gameTransitionsByPointId.get(point.id) ?? []),
    ...(isLastPoint ? ctx.endTransitions : []),
  ];

  return {
    pointId: point.id,
    pointNumber: point.pointIndex + 1,
    half: point.half,
    scoreBefore: point.scoresBySide,
    scoreAfter: buildScoreAfter(point),
    receivingSideId: point.receivingSideId,
    pullingSideId: point.pullingSideId,
    scoringSideId: point.scoringSideId,
    state: point.state,
    durationMs: point.durationMs,
    genderRatio: rawPoint.genderRatio,
    linesBySide: buildLinesBySide(point, rawPoint, ctx.analytics.participantNames),
    possessions: buildTimelinePossessions(point, ctx),
    subs: buildSubs(rawPoint.subs ?? [], ctx.analytics.participantNames),
    transitionsAfter: rawPoint.transitionsAfter ?? [],
    gameTransitionsAfter,
    ...(rawPoint.note != null ? { note: rawPoint.note } : {}),
  };
}

// ── Display helpers ─────────────────────────────────────────────────────────

export function getPointStateLabel(state: PointState): string {
  switch (state) {
    case 'hold':
      return 'Hold';
    case 'break':
      return 'Break';
    case 'broken':
      return 'Broken';
    case 'opp_hold':
      return 'Opp Hold';
    case 'in_progress':
      return 'In Progress';
    case 'terminated':
      return 'Terminated';
  }

  throw new Error('Unsupported point state');
}

export function getTransitionLabel(transition: BetweenPointTransition | GameTransition): string {
  switch (transition.transitionType) {
    case 'timeout':
      return transition.isFloater ? 'Floater Timeout' : 'Timeout';
    case 'spirit_timeout':
      return 'Spirit Timeout';
    case 'administrative':
      return 'Administrative';
    case 'heat_timeout':
      return 'Heat Timeout';
    case 'halftime':
      return 'Halftime';
    case 'soft_cap':
      return 'Soft Cap';
    case 'hard_cap':
      return 'Hard Cap';
  }

  throw new Error('Unsupported transition');
}

export type FlowItem =
  | {
      id: string;
      type: 'header';
      sideId: string;
      possession: AdvancedTimelinePossession;
    }
  | {
      id: string;
      type: 'action_single';
      possession: AdvancedTimelinePossession;
      action: AdvancedTimelineAction;
    }
  | {
      id: string;
      type: 'action_chain';
      possession: AdvancedTimelinePossession;
      chainActions: ThrowDisplayAction[];
    };

export function isCompleteThrow(action: AdvancedTimelineAction): action is ThrowDisplayAction {
  return action.kind === 'throw' && action.throwResult === 'complete';
}

export function appendActionFlowItems(
  flowItems: FlowItem[],
  possession: AdvancedTimelinePossession,
): void {
  const { actions } = possession;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    if (!isCompleteThrow(action)) {
      flowItems.push({
        id: action.id,
        type: 'action_single',
        action,
        possession,
      });
      continue;
    }

    const chainActions: ThrowDisplayAction[] = [action];

    while (i + 1 < actions.length) {
      const nextAction = actions[i + 1];
      if (!isCompleteThrow(nextAction)) break;

      chainActions.push(nextAction);
      i++;
    }

    if (chainActions.length >= 2) {
      flowItems.push({
        id: `chain-${chainActions[0].id}`,
        type: 'action_chain',
        chainActions,
        possession,
      });
      continue;
    }

    flowItems.push({
      id: action.id,
      type: 'action_single',
      action,
      possession,
    });
  }
}

export function createPointFlowItems(possessions: AdvancedTimelinePossession[]): FlowItem[] {
  const flowItems: FlowItem[] = [];

  possessions.forEach((possession) => {
    flowItems.push({
      id: `header-${possession.possessionId}`,
      type: 'header',
      sideId: possession.sideId,
      possession,
    });

    appendActionFlowItems(flowItems, possession);
  });

  return flowItems;
}

export type HeaderNodeColorKey = 'accent' | 'danger' | 'secondary' | 'neutral';

export function getHeaderNodeColorKey(
  sideId: string,
  possessionResult: string,
  focusSideId: string,
  oppSideId: string,
): HeaderNodeColorKey {
  if (sideId === focusSideId) return 'accent';
  if (sideId === oppSideId && possessionResult === 'scored') return 'danger';
  if (sideId === oppSideId) return 'secondary';
  return 'neutral';
}

export type ActionNodeColorKey = 'success' | 'danger' | 'warning' | 'accent' | 'overlay20';

export function getActionNodeColorKey(tone: ActionTone): ActionNodeColorKey {
  if (tone !== 'muted') return tone;
  return 'overlay20';
}

export function getTransitionIcon(transition: BetweenPointTransition | GameTransition) {
  switch (transition.transitionType) {
    case 'halftime':
      return 'whistle-outline';
    case 'soft_cap':
    case 'hard_cap':
      return 'flag-outline';
    case 'timeout':
    case 'spirit_timeout':
    case 'heat_timeout':
      return 'timer-pause-outline';
    case 'administrative':
      return 'clipboard-text-outline';
  }

  throw new Error('Unsupported transition');
}
