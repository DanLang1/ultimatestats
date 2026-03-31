import type {
  AdvancedTrackedGame,
  PlayerRef,
  PullAction,
  ThrowAction,
  TrackedPoint,
} from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getParticipantId(ref: PlayerRef): string | null {
  return ref.refType === 'participant' ? ref.participantId : null;
}

function getPulls(points: TrackedPoint[]): PullAction[] {
  const pulls: PullAction[] = [];
  for (const point of points) {
    for (const pos of point.possessions) {
      for (const action of pos.actions) {
        if (action.kind === 'pull') pulls.push(action);
      }
    }
  }
  return pulls;
}

// ── Player Stats ────────────────────────────────────────────────────────────

export interface PlayerStats {
  goals: number;
  assists: number;
  hockeyAssists: number;
  blocks: number;
  completions: number;
  throwaways: number;
  drops: number;
  halfThrowaways: number;
  halfDrops: number;
  callahans: number;
  touches: number;
  receivingTouches: number;
  pointsPlayed: number;
  plusMinus: number;
}

function emptyPlayerStats(): PlayerStats {
  return {
    goals: 0,
    assists: 0,
    hockeyAssists: 0,
    blocks: 0,
    completions: 0,
    throwaways: 0,
    drops: 0,
    halfThrowaways: 0,
    halfDrops: 0,
    callahans: 0,
    touches: 0,
    receivingTouches: 0,
    pointsPlayed: 0,
    plusMinus: 0,
  };
}

export function derivePlayerStats(game: AdvancedTrackedGame): Record<string, PlayerStats> {
  const stats: Record<string, PlayerStats> = {};

  const ensure = (id: string | null): PlayerStats | null => {
    if (!id) return null;
    if (!stats[id]) stats[id] = emptyPlayerStats();
    return stats[id];
  };

  for (const point of game.points) {
    // Points played + plus/minus from lineups
    for (const lineup of point.lineups) {
      for (const pid of lineup.participantIds) {
        const s = ensure(pid);
        if (s) s.pointsPlayed++;
      }
    }

    // Plus/minus: +1 if your side scored, -1 if opponent scored
    if (point.outcome.outcomeType === 'goal') {
      const scoringSideId = point.outcome.scoringSideId;
      for (const lineup of point.lineups) {
        const delta = lineup.sideId === scoringSideId ? 1 : -1;
        for (const pid of lineup.participantIds) {
          const s = ensure(pid);
          if (s) s.plusMinus += delta;
        }
      }
    }

    for (const pos of point.possessions) {
      const throwActions = pos.actions.filter((a): a is ThrowAction => a.kind === 'throw');

      for (let i = 0; i < pos.actions.length; i++) {
        const action = pos.actions[i];

        if (action.kind === 'pull') {
          if (action.receiver) {
            const s = ensure(getParticipantId(action.receiver));
            if (s) {
              s.touches++;
              s.receivingTouches++;
            }
          }
        }

        if (action.kind === 'disc_gain') {
          const s = ensure(getParticipantId(action.player));
          if (s) s.touches++;
        }

        if (action.kind === 'throw') {
          const throwerId = getParticipantId(action.thrower);
          const targetId = action.targetPlayer ? getParticipantId(action.targetPlayer) : null;

          switch (action.result) {
            case 'complete': {
              const s = ensure(throwerId);
              if (s) s.completions++;
              const t = ensure(targetId);
              if (t) {
                t.touches++;
                t.receivingTouches++;
              }
              break;
            }
            case 'goal': {
              const s = ensure(throwerId);
              if (s) {
                s.completions++;
                s.assists++;
              }
              const t = ensure(targetId);
              if (t) {
                t.goals++;
                t.touches++;
                t.receivingTouches++;
              }

              // Hockey assist: the thrower of the throw immediately before
              // the goal throw within the same possession
              const throwIdx = throwActions.indexOf(action);
              if (throwIdx > 0) {
                const prevThrow = throwActions[throwIdx - 1];
                if (prevThrow.result === 'complete' || prevThrow.result === 'goal') {
                  const ha = ensure(getParticipantId(prevThrow.thrower));
                  if (ha) ha.hockeyAssists++;
                }
              }
              break;
            }
            case 'throwaway': {
              if (action.turnoverAttribution?.mode === 'split') {
                const thr = ensure(getParticipantId(action.turnoverAttribution.thrower));
                if (thr) thr.halfThrowaways++;
                const rec = ensure(getParticipantId(action.turnoverAttribution.receiver));
                if (rec) rec.halfDrops++;
              } else {
                const s = ensure(throwerId);
                if (s) s.throwaways++;
              }
              break;
            }
            case 'drop': {
              if (action.turnoverAttribution?.mode === 'split') {
                const thr = ensure(getParticipantId(action.turnoverAttribution.thrower));
                if (thr) thr.halfThrowaways++;
                const rec = ensure(getParticipantId(action.turnoverAttribution.receiver));
                if (rec) rec.halfDrops++;
              } else {
                const s = ensure(targetId);
                if (s) s.drops++;
              }
              break;
            }
            case 'block': {
              const defId = action.defender ? getParticipantId(action.defender) : null;
              const s = ensure(defId);
              if (s) s.blocks++;
              break;
            }
            case 'callahan': {
              const defId = action.defender ? getParticipantId(action.defender) : null;
              const s = ensure(defId);
              if (s) {
                s.callahans++;
                s.goals++;
                s.touches++;
                s.receivingTouches++;
              }
              break;
            }
          }
        }
      }
    }
  }

  return stats;
}

// ── Completion Percentage ───────────────────────────────────────────────────

export function completionPercentage(stats: PlayerStats): number | null {
  const attempts = stats.completions + stats.throwaways + stats.drops + stats.halfThrowaways;
  if (attempts === 0) return null;
  return stats.completions / attempts;
}

// ── Per-point Rates ─────────────────────────────────────────────────────────

export function perPointRate(count: number, pointsPlayed: number): number | null {
  if (pointsPlayed === 0) return null;
  return count / pointsPlayed;
}

// ── Connection Stats ────────────────────────────────────────────────────────

export interface ConnectionStats {
  throwerId: string;
  receiverId: string;
  completions: number;
  goals: number;
  turnovers: number;
  attempts: number;
}

export function deriveConnectionStats(game: AdvancedTrackedGame): ConnectionStats[] {
  const map = new Map<string, ConnectionStats>();

  for (const point of game.points) {
    for (const pos of point.possessions) {
      for (const action of pos.actions) {
        if (action.kind !== 'throw') continue;
        const throwerId = getParticipantId(action.thrower);
        const receiverId = action.targetPlayer ? getParticipantId(action.targetPlayer) : null;
        if (!throwerId || !receiverId) continue;

        const key = `${throwerId}->${receiverId}`;
        let conn = map.get(key);
        if (!conn) {
          conn = {
            throwerId,
            receiverId,
            completions: 0,
            goals: 0,
            turnovers: 0,
            attempts: 0,
          };
          map.set(key, conn);
        }

        conn.attempts++;
        if (action.result === 'complete') conn.completions++;
        if (action.result === 'goal') {
          conn.completions++;
          conn.goals++;
        }
        if (
          action.result === 'drop' ||
          action.result === 'throwaway' ||
          action.result === 'block'
        ) {
          conn.turnovers++;
        }
      }
    }
  }

  return Array.from(map.values());
}

// ── Team Stats ──────────────────────────────────────────────────────────────

export interface TeamPointStats {
  oPoints: number;
  dPoints: number;
  holds: number;
  breaks: number;
  timesBroken: number;
  cleanHolds: number;
  dirtyHolds: number;
  oEfficiency: number | null;
  dEfficiency: number | null;
  possessionsPerPoint: number | null;
  scoresAfterTurnovers: number;
}

export function deriveTeamPointStats(sideId: string, points: TrackedPoint[]): TeamPointStats {
  let oPoints = 0;
  let dPoints = 0;
  let holds = 0;
  let breaks = 0;
  let timesBroken = 0;
  let cleanHolds = 0;
  let dirtyHolds = 0;
  let scoresAfterTurnovers = 0;
  let totalPossessions = 0;
  let finishedPoints = 0;

  for (const point of points) {
    const isOffense = point.offenseStartSideId === sideId;
    if (isOffense) oPoints++;
    else dPoints++;

    totalPossessions += point.possessions.length;

    if (point.outcome.outcomeType === 'goal') {
      finishedPoints++;
      const scored = point.outcome.scoringSideId === sideId;

      if (isOffense && scored) {
        holds++;
        // Clean hold = only 1 possession (no turnovers)
        const sidePossessions = point.possessions.filter((p) => p.sideId === sideId);
        if (sidePossessions.length === 1) {
          cleanHolds++;
        } else {
          dirtyHolds++;
        }
      }
      if (!isOffense && scored) breaks++;
      if (isOffense && !scored) timesBroken++;

      // Score after turnover: side scored but the scoring possession
      // was started by a turnover (meaning they got the disc back)
      if (scored) {
        const goalOutcome = point.outcome as Extract<typeof point.outcome, { outcomeType: 'goal' }>;
        const scoringPos = point.possessions.find((p) => p.id === goalOutcome.possessionId);
        if (scoringPos && scoringPos.startedBy.startType === 'turnover') {
          scoresAfterTurnovers++;
        }
      }
    }
  }

  const oEfficiency = oPoints > 0 ? holds / oPoints : null;
  const dEfficiency = dPoints > 0 ? breaks / dPoints : null;
  const possessionsPerPoint = finishedPoints > 0 ? totalPossessions / finishedPoints : null;

  return {
    oPoints,
    dPoints,
    holds,
    breaks,
    timesBroken,
    cleanHolds,
    dirtyHolds,
    oEfficiency,
    dEfficiency,
    possessionsPerPoint,
    scoresAfterTurnovers,
  };
}

// ── Pull Stats ──────────────────────────────────────────────────────────────

export interface PullStats {
  total: number;
  caught: number;
  dropped: number;
  landedInBounds: number;
  landedInBoundsRolledOut: number;
  bricked: number;
  averageHangTimeMs: number | null;
}

export function derivePullStats(sideId: string, points: TrackedPoint[]): PullStats {
  const pulls = getPulls(points).filter((p) => p.sideId === sideId);

  let caught = 0;
  let dropped = 0;
  let landedInBounds = 0;
  let landedInBoundsRolledOut = 0;
  let bricked = 0;
  let hangTimeTotal = 0;
  let hangTimeCount = 0;

  for (const pull of pulls) {
    switch (pull.result) {
      case 'caught':
        caught++;
        break;
      case 'dropped':
        dropped++;
        break;
      case 'landed_in_bounds':
        landedInBounds++;
        break;
      case 'landed_in_bounds_rolled_out':
        landedInBoundsRolledOut++;
        break;
      case 'bricked':
        bricked++;
        break;
    }
    if (pull.hangTimeMs != null) {
      hangTimeTotal += pull.hangTimeMs;
      hangTimeCount++;
    }
  }

  return {
    total: pulls.length,
    caught,
    dropped,
    landedInBounds,
    landedInBoundsRolledOut,
    bricked,
    averageHangTimeMs: hangTimeCount > 0 ? hangTimeTotal / hangTimeCount : null,
  };
}

// ── Score Derivation ────────────────────────────────────────────────────────

export function deriveScoreAfterPoint(point: TrackedPoint): Record<string, number> {
  const score = { ...point.scoreStart };
  if (point.outcome.outcomeType === 'goal') {
    const sid = point.outcome.scoringSideId;
    score[sid] = (score[sid] ?? 0) + 1;
  }
  return score;
}

export function deriveGameScore(game: AdvancedTrackedGame): Record<string, number> {
  const sideIds = game.sides.map((s) => s.id);
  const score: Record<string, number> = {};
  for (const sid of sideIds) score[sid] = 0;

  for (const point of game.points) {
    if (point.outcome.outcomeType === 'goal') {
      score[point.outcome.scoringSideId]++;
    }
  }
  return score;
}
