import type {
  AnalyticsAction,
  AnalyticsAttribution,
  AnalyticsGame,
  AnalyticsPoint,
  AnalyticsPossession,
  AnalyticsPossessionResult,
  AnalyticsTurnoverType,
  AttributionType,
  PointState,
} from './analyticsTypes';
import type {
  AdvancedTrackedGame,
  GameStatus,
  PlayerRef,
  PointPossession,
  PossessionAction,
  TrackedPoint,
} from './types';

const TURNOVER_RESULTS: readonly AnalyticsTurnoverType[] = [
  'drop',
  'throwaway',
  'stall',
  'block',
  'callahan',
];
function isTurnoverResult(r: string): r is AnalyticsTurnoverType {
  return (TURNOVER_RESULTS as readonly string[]).includes(r);
}
export const UNKNOWN_PARTICIPANT_ID = 'UNKNOWN_PARTICIPANT';

// ── Small utilities ───────────────────────────────────────────────────────────

function resolveRef(ref: PlayerRef): string | null {
  if (ref.refType === 'participant') return ref.participantId;
  if (ref.refType === 'unknown') return UNKNOWN_PARTICIPANT_ID;
  return null; // 'untracked' — intentionally anonymous, no attribution
}

function otherSide(sideId: string, sideIds: [string, string]): string {
  const other = sideIds.find((id) => id !== sideId);
  if (other == null) {
    throw new Error(`buildAnalyticsGame could not resolve opposite side for "${sideId}"`);
  }
  return other;
}

function getLastPossession(
  gameId: string,
  pointId: string,
  possessions: PointPossession[],
): PointPossession {
  const last = possessions[possessions.length - 1];
  if (last == null) {
    throw new Error(
      `buildAnalyticsGame requires point "${pointId}" in game "${gameId}" to have at least one possession`,
    );
  }
  return last;
}

function getLastAction(
  gameId: string,
  pointId: string,
  possessionId: string,
  actions: PossessionAction[],
): PossessionAction {
  const last = actions[actions.length - 1];
  if (last == null) {
    throw new Error(
      `buildAnalyticsGame requires possession "${possessionId}" in point "${pointId}" for game "${gameId}" to have at least one action`,
    );
  }
  return last;
}

function assertSideId(sideId: string, sideIds: [string, string], message: string): void {
  if (!sideIds.includes(sideId)) throw new Error(message);
}

function assertParticipantId(
  participantId: string,
  participantIds: Set<string>,
  message: string,
): void {
  if (!participantIds.has(participantId)) throw new Error(message);
}

// ── Attribution emission ──────────────────────────────────────────────────────

function addAttribution(
  attributions: AnalyticsAttribution[],
  type: AttributionType,
  participantId: string | null,
  actionId: string,
  pointId: string,
  weight = 1,
) {
  if (participantId === null) return;
  attributions.push({ type, participantId, weight, actionId, pointId });
}

function emitAttributions(
  action: PossessionAction,
  resolved: { actorId: string | null; receiverId: string | null; defenderId: string | null },
  pointId: string,
  previousAction: AnalyticsAction | null,
  attributions: AnalyticsAttribution[],
) {
  const { actorId, receiverId, defenderId } = resolved;
  const add = (type: AttributionType, id: string | null, weight = 1) =>
    addAttribution(attributions, type, id, action.id, pointId, weight);

  if (action.kind === 'pull') {
    add('pull', actorId);
    if (action.result === 'inbound') add('pull_reception', receiverId);
    if (action.result === 'dropped') add('drop', receiverId); // puller is opposing team — no throwaway
    return;
  }

  if (action.kind === 'disc_pickup') {
    add('disc_pickup', actorId);
    return;
  }

  if (action.kind === 'throw') {
    const split = action.splitAttribution ?? false;

    switch (action.result) {
      case 'complete':
        add('throw_attempt', actorId);
        add('completion', actorId);
        add('receiving_touch', receiverId);
        break;

      case 'goal':
        add('throw_attempt', actorId);
        add('completion', actorId);
        add('assist', actorId);
        add('goal', receiverId);
        add('receiving_touch', receiverId);
        if (previousAction?.kind === 'throw' && previousAction.result === 'complete') {
          add('hockey_assist', previousAction.actorId);
        }
        break;

      case 'drop':
        add('throw_attempt', actorId);
        if (split) {
          add('throwaway', actorId, 0.5);
          add('drop', receiverId, 0.5);
        } else {
          add('drop', receiverId);
        }
        break;

      case 'throwaway':
        add('throw_attempt', actorId);
        // splitAttribution requires a receiver counterpart — throwaway has no toPlayer,
        // so split is ignored and full weight always goes to the thrower.
        add('throwaway', actorId);
        break;

      case 'stall':
        add('stall_conceded', actorId);
        add('stall', defenderId);
        break;

      case 'block':
        add('throw_attempt', actorId);
        add('throwaway', actorId);
        add('block', defenderId);
        break;

      case 'callahan':
        add('throw_attempt', actorId);
        add('throwaway', actorId);
        add('callahan', defenderId ?? receiverId);
        add('block', defenderId ?? receiverId);
        add('goal', defenderId ?? receiverId);
        break;
    }
  }
}

// ── Build context ─────────────────────────────────────────────────────────────

/** Constants derived from the game that are shared across all per-point and per-possession builders. */
type GameBuildContext = {
  gameId: string;
  gameStatus: GameStatus;
  focusSideId: string;
  sideIds: [string, string];
  participantIds: Set<string>;
};

function assertTwoSideGame(game: AdvancedTrackedGame): [string, string] {
  const sideIds = game.sides.map((side) => side.id);
  if (sideIds.length !== 2) {
    throw new Error(
      `buildAnalyticsGame requires exactly 2 sides, received ${sideIds.length} for game ${game.id}`,
    );
  }
  if (!sideIds.includes(game.focusSideId)) {
    throw new Error(
      `buildAnalyticsGame requires focusSideId "${game.focusSideId}" to match a game side`,
    );
  }
  if (!sideIds.includes(game.initialReceivingSideId)) {
    throw new Error(
      `buildAnalyticsGame requires initialReceivingSideId "${game.initialReceivingSideId}" to match a game side`,
    );
  }
  return [sideIds[0], sideIds[1]];
}

function buildGameContext(game: AdvancedTrackedGame): GameBuildContext {
  return {
    gameId: game.id,
    gameStatus: game.status,
    focusSideId: game.focusSideId,
    sideIds: assertTwoSideGame(game),
    participantIds: new Set(game.participants.map((p) => p.id)),
  };
}

// ── Per-point builders ────────────────────────────────────────────────────────

type PauseOffset = { afterActionIndex: number; durationMs: number };

/**
 * Collects completed stoppage durations in global-action-index order.
 * Used to subtract dead time from elapsedMs for actions logged after each resumption.
 */
function buildPauseOffsets(point: TrackedPoint): PauseOffset[] {
  return point.possessions
    .flatMap((poss) => poss.actions)
    .flatMap((action, globalActionIndex) =>
      action.kind === 'stoppage' && action.pausedAt != null && action.resumedAt != null
        ? [{ afterActionIndex: globalActionIndex, durationMs: action.resumedAt - action.pausedAt }]
        : [],
    );
}

/** Derives which side scored from the last action of the last possession. */
function deriveScoringSideId(point: TrackedPoint, ctx: GameBuildContext): string | null {
  const lastPoss = getLastPossession(ctx.gameId, point.id, point.possessions);
  const lastAction = getLastAction(ctx.gameId, point.id, lastPoss.id, lastPoss.actions);
  if (lastAction.kind !== 'throw') return null;
  if (lastAction.result === 'goal') return lastPoss.sideId;
  if (lastAction.result === 'callahan') return otherSide(lastPoss.sideId, ctx.sideIds);
  return null;
}

/**
 * Builds linesBySide for a point, including mid-point sub-in players.
 * Sub-out players retain credit via the starting lines; sub-ins are merged in additively.
 */
function buildLinesBySide(point: TrackedPoint, ctx: GameBuildContext): Record<string, string[]> {
  const linesBySide: Record<string, string[]> = {};

  for (const line of point.lines) {
    assertSideId(
      line.sideId,
      ctx.sideIds,
      `buildAnalyticsGame requires point "${point.id}" line sideId "${line.sideId}" to match a game side`,
    );
    for (const participantId of line.participantIds) {
      assertParticipantId(
        participantId,
        ctx.participantIds,
        `buildAnalyticsGame requires point "${point.id}" line participantId "${participantId}" to match a game participant`,
      );
    }
    linesBySide[line.sideId] = [...line.participantIds];
  }

  for (const sub of point.subs ?? []) {
    assertSideId(
      sub.sideId,
      ctx.sideIds,
      `buildAnalyticsGame requires point "${point.id}" sub sideId "${sub.sideId}" to match a game side`,
    );
    for (const participantId of [...sub.inIds, ...sub.outIds]) {
      assertParticipantId(
        participantId,
        ctx.participantIds,
        `buildAnalyticsGame requires point "${point.id}" sub participantId "${participantId}" to match a game participant`,
      );
    }
    if (!linesBySide[sub.sideId]) linesBySide[sub.sideId] = [];
    const existing = new Set(linesBySide[sub.sideId]);
    for (const id of sub.inIds) {
      if (!existing.has(id)) {
        linesBySide[sub.sideId].push(id);
        existing.add(id);
      }
    }
  }

  return linesBySide;
}

function derivePointState(
  gameStatus: GameStatus,
  isLastPoint: boolean,
  focusSideId: string,
  receivingSideId: string,
  scoringSideId: string | null,
): PointState {
  if (scoringSideId === null) {
    if (gameStatus === 'terminated' && isLastPoint) {
      return 'terminated';
    }
    throw new Error(
      'buildAnalyticsGame requires every point to end with a score unless the game terminated mid-point',
    );
  }
  const focusReceived = receivingSideId === focusSideId;
  const focusScored = scoringSideId === focusSideId;
  if (focusReceived && focusScored) return 'hold';
  if (!focusReceived && focusScored) return 'break';
  if (focusReceived && !focusScored) return 'broken';
  return 'opp_hold';
}

// ── Per-possession builder ────────────────────────────────────────────────────

type CompiledPossession = {
  possession: AnalyticsPossession;
  actions: AnalyticsAction[];
  attributions: AnalyticsAttribution[];
};

/**
 * Compiles a single possession and all its actions into analytics output.
 *
 * `actionStartIndex` is the global action index (across all possessions in the point)
 * of the first action in this possession — used for pause offset calculations.
 */
function compilePossessionWithActions(
  poss: PointPossession,
  possIndex: number,
  isLastPossession: boolean,
  pointId: string,
  pointIndex: number,
  isLastPoint: boolean,
  actionStartIndex: number,
  pauseOffsets: PauseOffset[],
  startedAt: number | undefined,
  ctx: GameBuildContext,
): CompiledPossession {
  assertSideId(
    poss.sideId,
    ctx.sideIds,
    `buildAnalyticsGame requires possession "${poss.id}" in point "${pointId}" to have a valid sideId`,
  );

  const possActionIds = poss.actions.map((a) => a.id);

  // Derive possession result
  const possLastAction = getLastAction(ctx.gameId, pointId, poss.id, poss.actions);
  let possResult: AnalyticsPossessionResult | null = null;
  let turnoverType: AnalyticsTurnoverType | undefined;
  if (possLastAction.kind === 'throw') {
    if (possLastAction.result === 'goal') {
      possResult = 'scored';
    } else if (isTurnoverResult(possLastAction.result)) {
      possResult = 'turned_over';
      turnoverType = possLastAction.result;
    }
  } else if (possLastAction.kind === 'pull' && possLastAction.result === 'dropped') {
    possResult = 'turned_over';
    turnoverType = 'drop';
  }
  if (possResult === null) {
    if (ctx.gameStatus === 'terminated' && isLastPoint && isLastPossession) {
      possResult = 'terminated';
    } else {
      throw new Error(
        `buildAnalyticsGame requires possession "${poss.id}" in point "${pointId}" to end with a scoring or turnover throw unless the game terminated mid-possession`,
      );
    }
  }

  const possession: AnalyticsPossession = {
    id: poss.id,
    pointId,
    pointIndex,
    possessionIndex: possIndex,
    sideId: poss.sideId,
    result: possResult,
    turnoverType,
  };

  const compiledActions: AnalyticsAction[] = [];
  const compiledAttributions: AnalyticsAttribution[] = [];

  for (let actionIndex = 0; actionIndex < poss.actions.length; actionIndex++) {
    const action = poss.actions[actionIndex];

    // Validate action sideId against possession and game sides
    if (action.kind === 'pull') {
      assertSideId(
        action.sideId,
        ctx.sideIds,
        `buildAnalyticsGame requires pull action "${action.id}" in point "${pointId}" to have a valid sideId`,
      );
      if (action.receivingSideId !== poss.sideId) {
        throw new Error(
          `buildAnalyticsGame requires pull action "${action.id}" receivingSideId "${action.receivingSideId}" to match possession sideId "${poss.sideId}"`,
        );
      }
      if (action.sideId !== otherSide(action.receivingSideId, ctx.sideIds)) {
        throw new Error(
          `buildAnalyticsGame requires pull action "${action.id}" sideId "${action.sideId}" to be the opposite of receivingSideId "${action.receivingSideId}"`,
        );
      }
    } else if (action.kind !== 'stoppage' && action.sideId !== poss.sideId) {
      // Stoppages are mid-play pauses; their sideId is independent of the possession
      // (a defending team may call a timeout during the opponent's possession, and
      // `manual_pause` stoppages have no sideId at all).
      throw new Error(
        `buildAnalyticsGame requires ${action.kind} action "${action.id}" sideId "${action.sideId}" to match possession sideId "${poss.sideId}"`,
      );
    }

    // Walk backwards skipping stoppages — stoppages are mid-play pauses and should not
    // block hockey assist detection. previousAction is scoped to this possession.
    let previousAction: AnalyticsAction | null = null;
    let previousActionId: string | null = null;
    for (let i = actionIndex - 1; i >= 0; i--) {
      if (poss.actions[i].kind !== 'stoppage') {
        previousAction = compiledActions[i];
        previousActionId = possActionIds[i];
        break;
      }
    }

    // Resolve PlayerRef fields
    let actorId: string | null = null;
    let receiverId: string | null = null;
    let defenderId: string | null = null;
    let result: string | undefined;
    let hangTimeMs: number | undefined;

    if (action.kind === 'pull') {
      actorId = resolveRef(action.puller);
      receiverId = action.receiver ? resolveRef(action.receiver) : null;
      result = action.result;
      hangTimeMs = action.hangTimeMs;
    } else if (action.kind === 'disc_pickup') {
      actorId = resolveRef(action.player);
    } else if (action.kind === 'throw') {
      actorId = resolveRef(action.thrower);
      receiverId = action.toPlayer ? resolveRef(action.toPlayer) : null;
      defenderId = action.defender ? resolveRef(action.defender) : null;
      result = action.result;
    }

    const globalIndex = actionStartIndex + actionIndex;
    const totalPausedMs = pauseOffsets.reduce(
      (sum, p) => (p.afterActionIndex < globalIndex ? sum + p.durationMs : sum),
      0,
    );

    const elapsedMs =
      action.recordedAt != null && startedAt != null
        ? // A stoppage marks when play stopped — its own elapsedMs reflects game time up to
          // that moment. Pause subtraction only applies to actions logged after resumption.
          action.recordedAt - startedAt - totalPausedMs
        : null;

    const compiledAction: AnalyticsAction = {
      id: action.id,
      kind: action.kind,
      pointId,
      pointIndex,
      possessionId: poss.id,
      possessionIndex: possIndex,
      actionIndex,
      // Use the action's own sideId for pull (the pulling side, not the receiving possession's side).
      // For throw, disc_pickup, and stoppage, action.sideId matches poss.sideId by convention.
      sideId: action.kind === 'pull' ? action.sideId : poss.sideId,
      actorId,
      receiverId,
      defenderId,
      result,
      ...(hangTimeMs != null ? { hangTimeMs } : {}),
      previousActionId,
      splitAttribution: action.kind === 'throw' ? (action.splitAttribution ?? false) : false,
      elapsedMs,
    };

    compiledActions.push(compiledAction);
    emitAttributions(
      action,
      { actorId, receiverId, defenderId },
      pointId,
      previousAction,
      compiledAttributions,
    );
  }

  return { possession, actions: compiledActions, attributions: compiledAttributions };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function buildAnalyticsGame(game: AdvancedTrackedGame): AnalyticsGame {
  const ctx = buildGameContext(game);

  const halftimeAfterPointId = game.gameTransitions?.find(
    (t) => t.transitionType === 'halftime',
  )?.afterPointId;

  const points: AnalyticsPoint[] = [];
  const possessions: AnalyticsPossession[] = [];
  const actions: AnalyticsAction[] = [];
  const attributions: AnalyticsAttribution[] = [];

  let receivingSideId = game.initialReceivingSideId;
  let currentHalf: 1 | 2 = 1;
  const runningScores: Record<string, number> = Object.fromEntries(
    game.sides.map((s) => [s.id, 0]),
  );

  for (let pointIndex = 0; pointIndex < game.points.length; pointIndex++) {
    const point = game.points[pointIndex];
    const isLastPoint = pointIndex === game.points.length - 1;

    // Snapshot scores before this point is resolved — represents the score at the time
    // this point was played. Useful for contextual stats (e.g. break rate when trailing).
    const scoresBySide = { ...runningScores };

    const pauseOffsets = buildPauseOffsets(point);
    const pullingSideId = otherSide(receivingSideId, ctx.sideIds);
    const scoringSideId = deriveScoringSideId(point, ctx);
    const linesBySide = buildLinesBySide(point, ctx);

    const isCleanHold =
      scoringSideId !== null ? new Set(point.possessions.map((p) => p.sideId)).size === 1 : null;

    const lastPoss = getLastPossession(ctx.gameId, point.id, point.possessions);
    const lastAction = getLastAction(ctx.gameId, point.id, lastPoss.id, lastPoss.actions);
    const durationMs =
      lastAction.recordedAt != null && point.startedAt != null
        ? lastAction.recordedAt -
          point.startedAt -
          pauseOffsets.reduce((sum, p) => sum + p.durationMs, 0)
        : null;

    points.push({
      id: point.id,
      pointIndex,
      half: currentHalf,
      receivingSideId,
      pullingSideId,
      scoringSideId,
      state: derivePointState(
        ctx.gameStatus,
        isLastPoint,
        ctx.focusSideId,
        receivingSideId,
        scoringSideId,
      ),
      linesBySide,
      scoresBySide,
      genderRatio: point.genderRatio,
      durationMs,
      isCleanHold,
    });

    if (scoringSideId !== null) {
      runningScores[scoringSideId] = (runningScores[scoringSideId] ?? 0) + 1;
    }

    let actionStartIndex = 0;
    for (let possIndex = 0; possIndex < point.possessions.length; possIndex++) {
      const poss = point.possessions[possIndex];
      const isLastPossession = possIndex === point.possessions.length - 1;

      const compiled = compilePossessionWithActions(
        poss,
        possIndex,
        isLastPossession,
        point.id,
        pointIndex,
        isLastPoint,
        actionStartIndex,
        pauseOffsets,
        point.startedAt,
        ctx,
      );

      possessions.push(compiled.possession);
      actions.push(...compiled.actions);
      attributions.push(...compiled.attributions);

      actionStartIndex += poss.actions.length;
    }

    // Advance receiving side: scoring team pulls next, other side receives
    if (scoringSideId !== null) {
      receivingSideId = otherSide(scoringSideId, ctx.sideIds);
    }

    // Halftime flips receiving side to the side that pulled to open the game
    if (halftimeAfterPointId === point.id) {
      receivingSideId = otherSide(game.initialReceivingSideId, ctx.sideIds);
      currentHalf = 2;
    }
  }

  const [sideA, sideB] = game.sides;
  const oppSideId = sideA.id === game.focusSideId ? sideB.id : sideA.id;

  return {
    gameType: game.gameType,
    focusSideId: game.focusSideId,
    oppSideId,
    sideLabels: Object.fromEntries(game.sides.map((s) => [s.id, s.label])),
    participantNames: new Map(game.participants.map((p) => [p.id, p.name])),
    metadata: game.metadata,
    createdAt: game.createdAt,
    points,
    possessions,
    actions,
    attributions,
  };
}

/**
 * Returns the final score for each side. scoresBySide on each AnalyticsPoint
 * captures the score at the START of that point, so we add the last point's score.
 */
export function getFinalScores(game: AnalyticsGame): Record<string, number> {
  const lastPoint = game.points[game.points.length - 1];
  if (!lastPoint) return {};
  const scores = { ...lastPoint.scoresBySide };
  if (lastPoint.scoringSideId != null) {
    scores[lastPoint.scoringSideId] = (scores[lastPoint.scoringSideId] ?? 0) + 1;
  }
  return scores;
}

/**
 * Derives the point state from any side's perspective without recompiling the game.
 * Use this instead of point.state when working with both-team tracking or scrimmages,
 * where you need hold/break rates for either side from a single AnalyticsGame.
 *
 * terminated is perspective-neutral and returns the same value for any sideId.
 */
export function getPointStateForSide(point: AnalyticsPoint, sideId: string): PointState {
  if (point.state === 'terminated') return point.state;
  const received = point.receivingSideId === sideId;
  const scored = point.scoringSideId === sideId;
  if (received && scored) return 'hold';
  if (!received && scored) return 'break';
  if (received && !scored) return 'broken';
  return 'opp_hold';
}
