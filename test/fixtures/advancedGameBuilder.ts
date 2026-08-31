import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import {
  assertTwoSides,
  assertValidParticipantRefs,
  assertValidPointLineHistory,
} from '@/lib/advancedTracking/trackingUtils';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedGameType,
  type AdvancedTrackedGame,
  type BetweenPointTransition,
  type FieldLocation,
  type GameMetadata,
  type GameSide,
  type GameStatus,
  type GameTransition,
  type Participant,
  type PlayerRef,
  type PointLine,
  type PointPossession,
  type PullAction,
  type PullResult,
  type StoppageAction,
  type ThrowAction,
  type ThrowDetails,
  type ThrowResult,
  type TrackedPoint,
} from '@/lib/advancedTracking/types';
import type { GenderRatio } from '@/lib/genderRatioUtils';

export const ADVANCED_TEST_FOCUS_SIDE_ID = 'focus';
export const ADVANCED_TEST_OPPONENT_SIDE_ID = 'opponent';
export const ADVANCED_TEST_TIMESTAMP = Date.UTC(2026, 0, 1);

export const ADVANCED_TEST_SIDES: GameSide[] = [
  {
    id: ADVANCED_TEST_FOCUS_SIDE_ID,
    label: 'Focus',
    trackingMode: 'full-roster',
  },
  {
    id: ADVANCED_TEST_OPPONENT_SIDE_ID,
    label: 'Opponent',
    trackingMode: 'anonymous',
  },
];

export const ADVANCED_TEST_PARTICIPANTS: Participant[] = [
  { id: 'alex', name: 'Alex' },
  { id: 'blair', name: 'Blair' },
  { id: 'casey', name: 'Casey' },
  { id: 'dana', name: 'Dana' },
  { id: 'eli', name: 'Eli' },
  { id: 'finn', name: 'Finn' },
  { id: 'gia', name: 'Gia' },
  { id: 'hana', name: 'Hana' },
];

export const UNTRACKED_PLAYER: PlayerRef = { refType: 'untracked' };
export const UNKNOWN_PLAYER: PlayerRef = { refType: 'unknown' };

export function participantRef(participantId: string): PlayerRef {
  return { refType: 'participant', participantId };
}

export interface AdvancedGameFixtureOptions {
  id?: string;
  schemaVersion?: number;
  createdAt?: number;
  updatedAt?: number;
  gameType?: AdvancedGameType;
  status?: GameStatus;
  endReason?: AdvancedTrackedGame['endReason'];
  focusSideId?: string;
  initialReceivingSideId?: string;
  metadata?: GameMetadata;
  settings?: AdvancedTrackedGame['settings'];
  sides?: GameSide[];
  participants?: Participant[];
  defaultLines?: PointLine[];
  points?: TrackedPoint[];
  gameTransitions?: GameTransition[];
  gameClockPauses?: AdvancedTrackedGame['gameClockPauses'];
}

export function createAdvancedGameFixture(
  options: AdvancedGameFixtureOptions = {},
): AdvancedTrackedGame {
  const sides = options.sides ?? ADVANCED_TEST_SIDES;
  const participants = options.participants ?? ADVANCED_TEST_PARTICIPANTS;

  return cloneFixture({
    id: options.id ?? 'advanced-test-game',
    schemaVersion: options.schemaVersion ?? ADVANCED_TRACKING_SCHEMA_VERSION,
    createdAt: options.createdAt ?? ADVANCED_TEST_TIMESTAMP,
    updatedAt: options.updatedAt ?? options.createdAt ?? ADVANCED_TEST_TIMESTAMP,
    gameType: options.gameType ?? 'game',
    status: options.status ?? 'in_progress',
    endReason: options.endReason,
    focusSideId: options.focusSideId ?? sides[0].id,
    initialReceivingSideId: options.initialReceivingSideId ?? sides[0].id,
    metadata: options.metadata,
    settings: options.settings ?? { locationMode: 'none' },
    sides,
    participants,
    gameTransitions: options.gameTransitions,
    gameClockPauses: options.gameClockPauses,
    points: options.points ?? [],
  });
}

type WithoutId<T> = T extends { id: string } ? Omit<T, 'id'> & { id?: string } : never;

export interface StartPointOptions {
  id?: string;
  lines?: PointLine[];
  puller: PlayerRef;
  receiver?: PlayerRef;
  pullResult?: PullResult;
  pullId?: string;
  possessionId?: string;
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
  recordedAt?: number;
  genderRatio?: GenderRatio;
  startedAt?: number;
  note?: string;
}

export interface StartPossessionOptions {
  id?: string;
  holder?: PlayerRef;
}

export interface PickupOptions {
  id?: string;
  location?: FieldLocation;
  recordedAt?: number;
}

export interface ThrowOptions {
  id?: string;
  thrower?: PlayerRef;
  toPlayer?: PlayerRef;
  defender?: PlayerRef;
  splitAttribution?: boolean;
  details?: ThrowDetails;
  origin?: FieldLocation;
  target?: FieldLocation;
  recordedAt?: number;
}

export interface StoppageOptions {
  id?: string;
  sideId?: string;
  isFloater?: boolean;
  recordedAt?: number;
  pausedAt?: number;
  resumedAt?: number;
}

export interface InjurySubOptions {
  id?: string;
  sideId: string;
  inIds: string[];
  outIds: string[];
  stoppageActionId?: string;
}

export interface HoldOptions extends StartPointOptions {
  passes?: PlayerRef[];
  scorer?: PlayerRef;
}

export interface BreakAfterTurnoverOptions extends StartPointOptions {
  turnoverResult: Exclude<ThrowResult, 'complete' | 'goal' | 'callahan'>;
  defender?: PlayerRef;
  pickupPlayer?: PlayerRef;
  caughtByDefender?: boolean;
  passes?: PlayerRef[];
  scorer?: PlayerRef;
}

/**
 * Builds valid, deterministic advanced-game records without touching Zustand or persistence.
 * Store behavior tests should still arrange preconditions through the production store actions.
 */
export class AdvancedGameScenarioBuilder {
  private readonly game: AdvancedTrackedGame;
  private readonly defaultLines: PointLine[];
  private readonly counters = new Map<string, number>();
  private currentHolder: PlayerRef | undefined;
  private lastStoppageActionId: string | undefined;
  private nextReceivingSideId: string;

  constructor(options: AdvancedGameFixtureOptions = {}) {
    this.game = createAdvancedGameFixture(options);
    this.defaultLines = cloneFixture(
      options.defaultLines ?? [
        {
          sideId: this.game.focusSideId,
          participantIds: this.game.participants.slice(0, 7).map((participant) => participant.id),
        },
      ],
    );
    this.nextReceivingSideId = this.game.initialReceivingSideId;
  }

  startPoint(options: StartPointOptions): this {
    const previousPoint = this.game.points.at(-1);
    if (previousPoint != null && !pointHasScore(previousPoint)) {
      throw new Error(`Cannot start a point after unfinished point "${previousPoint.id}".`);
    }

    const pullResult = options.pullResult ?? 'inbound';
    if ((pullResult === 'ob' || pullResult === 'roller') && options.receiver != null) {
      throw new Error(`A ${pullResult} pull cannot have a receiver.`);
    }

    const pointId = options.id ?? this.nextId('point');
    const possessionId = options.possessionId ?? this.nextId('possession');
    const pullId = options.pullId ?? this.nextId('action');
    const receivingSideId = this.nextReceivingSideId;
    const pullingSideId = this.otherSideId(receivingSideId);
    const pull: PullAction = {
      id: pullId,
      kind: 'pull',
      sideId: pullingSideId,
      receivingSideId,
      puller: options.puller,
      receiver: options.receiver,
      result: pullResult,
      hangTimeMs: options.hangTimeMs,
      origin: options.origin,
      landing: options.landing,
      recordedAt: options.recordedAt,
    };
    const possession: PointPossession = {
      id: possessionId,
      sideId: receivingSideId,
      actions: [pull],
    };
    this.game.points.push({
      id: pointId,
      note: options.note,
      lines: cloneFixture(options.lines ?? this.defaultLines),
      possessions: [possession],
      genderRatio: options.genderRatio,
      startedAt: options.startedAt,
    });
    this.currentHolder =
      pull.result === 'inbound' && pull.receiver != null ? pull.receiver : undefined;
    this.lastStoppageActionId = undefined;
    return this;
  }

  hold({ passes = [], scorer, ...point }: HoldOptions): this {
    this.startPoint(point);
    for (const receiver of passes) this.complete(receiver);
    return this.goal(scorer);
  }

  breakAfterTurnover({
    turnoverResult,
    defender,
    pickupPlayer,
    caughtByDefender = false,
    passes = [],
    scorer,
    ...point
  }: BreakAfterTurnoverOptions): this {
    this.startPoint(point).turnover(turnoverResult, { defender });
    const scoringSideId = this.otherSideId(this.currentPossession().sideId);
    if (caughtByDefender) {
      if (defender == null) throw new Error('A caught turnover requires a defender.');
      this.startPossession(scoringSideId, { holder: defender });
    } else {
      if (pickupPlayer == null) throw new Error('A grounded turnover requires a pickup player.');
      this.startPossession(scoringSideId).pickup(pickupPlayer);
    }
    for (const receiver of passes) this.complete(receiver);
    return this.goal(scorer);
  }

  startPossession(sideId: string, options: StartPossessionOptions = {}): this {
    const point = this.currentPoint();
    point.possessions.push({
      id: options.id ?? this.nextId('possession'),
      sideId,
      actions: [],
    });
    this.currentHolder = options.holder;
    return this;
  }

  pickup(player: PlayerRef, options: PickupOptions = {}): this {
    const possession = this.currentPossession();
    possession.actions.push({
      id: options.id ?? this.nextId('action'),
      kind: 'disc_pickup',
      sideId: possession.sideId,
      player,
      location: options.location,
      recordedAt: options.recordedAt,
    });
    this.currentHolder = player;
    return this;
  }

  throw(result: ThrowResult, options: ThrowOptions = {}): this {
    const possession = this.currentPossession();
    const thrower = options.thrower ?? this.currentHolder;
    if (thrower == null) {
      throw new Error(`Cannot record ${result} without a current holder or explicit thrower.`);
    }

    const action: ThrowAction = {
      id: options.id ?? this.nextId('action'),
      kind: 'throw',
      sideId: possession.sideId,
      thrower,
      result,
      toPlayer: options.toPlayer,
      defender: options.defender,
      splitAttribution: options.splitAttribution,
      details: options.details,
      origin: options.origin,
      target: options.target,
      recordedAt: options.recordedAt,
    };
    possession.actions.push(action);

    if (result === 'complete') {
      if (options.toPlayer == null) throw new Error('A completion requires a receiver.');
      this.currentHolder = options.toPlayer;
      return this;
    }

    this.currentHolder = undefined;
    if (result === 'goal') {
      if (options.toPlayer == null && possession.sideId === this.game.focusSideId) {
        throw new Error('A goal by the tracked side requires a scorer.');
      }
      this.nextReceivingSideId = this.otherSideId(possession.sideId);
    } else if (result === 'callahan') {
      this.nextReceivingSideId = possession.sideId;
    }
    return this;
  }

  complete(receiver: PlayerRef, options: Omit<ThrowOptions, 'toPlayer'> = {}): this {
    return this.throw('complete', { ...options, toPlayer: receiver });
  }

  goal(scorer?: PlayerRef, options: Omit<ThrowOptions, 'toPlayer'> = {}): this {
    return this.throw('goal', { ...options, toPlayer: scorer });
  }

  turnover(
    result: Exclude<ThrowResult, 'complete' | 'goal' | 'callahan'>,
    options: ThrowOptions = {},
  ): this {
    return this.throw(result, options);
  }

  callahan(scorer: PlayerRef, options: Omit<ThrowOptions, 'defender'> = {}): this {
    return this.throw('callahan', { ...options, defender: scorer });
  }

  stoppage(reason: StoppageAction['reason'], options: StoppageOptions = {}): this {
    const actionId = options.id ?? this.nextId('action');
    this.currentPossession().actions.push({
      id: actionId,
      kind: 'stoppage',
      reason,
      sideId: options.sideId,
      isFloater: options.isFloater,
      recordedAt: options.recordedAt,
      pausedAt: options.pausedAt,
      resumedAt: options.resumedAt,
    });
    this.lastStoppageActionId = actionId;
    return this;
  }

  injurySub(options: InjurySubOptions): this {
    const stoppageActionId = options.stoppageActionId ?? this.lastStoppageActionId;
    if (stoppageActionId == null) {
      throw new Error('An injury sub requires a stoppage action.');
    }
    const point = this.currentPoint();
    point.subs ??= [];
    point.subs.push({
      id: options.id ?? this.nextId('sub'),
      sideId: options.sideId,
      type: 'injury',
      inIds: [...options.inIds],
      outIds: [...options.outIds],
      stoppageActionId,
    });
    return this;
  }

  transitionAfterPoint(transition: WithoutId<BetweenPointTransition>): this {
    const point = this.currentPoint();
    if (!pointHasScore(point)) {
      throw new Error('A between-point transition requires a completed point.');
    }
    point.transitionsAfter ??= [];
    point.transitionsAfter.push({
      ...transition,
      id: transition.id ?? this.nextId('between-point-transition'),
    });
    return this;
  }

  gameTransition(
    transition:
      | { id?: string; transitionType: 'halftime'; triggeredEarly?: boolean }
      | { id?: string; transitionType: 'soft_cap' }
      | { id?: string; transitionType: 'hard_cap'; afterPointId?: string },
  ): this {
    const point = this.currentPoint();
    const pointEnded = pointHasScore(point);
    this.game.gameTransitions ??= [];
    const id = transition.id ?? this.nextId('game-transition');

    if (transition.transitionType === 'halftime') {
      if (!pointEnded) throw new Error('Halftime requires a completed point.');
      this.game.gameTransitions.push({
        id,
        transitionType: 'halftime',
        afterPointId: point.id,
        triggeredEarly: transition.triggeredEarly,
      });
      this.nextReceivingSideId = this.otherSideId(this.game.initialReceivingSideId);
    } else if (transition.transitionType === 'soft_cap') {
      if (!pointEnded) throw new Error('Soft cap requires a completed point.');
      this.game.gameTransitions.push({
        id,
        transitionType: 'soft_cap',
        afterPointId: point.id,
      });
    } else {
      this.game.gameTransitions.push({
        id,
        transitionType: 'hard_cap',
        afterPointId: transition.afterPointId ?? (pointEnded ? point.id : undefined),
      });
    }
    return this;
  }

  addPoint(point: TrackedPoint): this {
    const nextPoint = cloneFixture(point);
    this.game.points.push(nextPoint);
    const scoringSideId = getScoringSideId(nextPoint, this.game.sides);
    if (scoringSideId != null) {
      this.nextReceivingSideId = this.otherSideId(scoringSideId);
      this.currentHolder = undefined;
    }
    return this;
  }

  build(): AdvancedTrackedGame {
    const game = cloneFixture(this.game);
    validateAdvancedGameFixture(game);
    return game;
  }

  buildAnalytics(): AnalyticsGame {
    return buildAnalyticsGame(this.build());
  }

  buildPoint(): TrackedPoint {
    const game = this.build();
    const point = game.points.at(-1);
    if (point == null) throw new Error('Start a point before building a point fixture.');
    return point;
  }

  /** Use only when invalid or legacy structure is the behavior under test. */
  buildUnsafe(): AdvancedTrackedGame {
    return cloneFixture(this.game);
  }

  private currentPoint(): TrackedPoint {
    const point = this.game.points.at(-1);
    if (point == null) throw new Error('Start a point before adding scenario events.');
    return point;
  }

  private currentPossession(): PointPossession {
    const possession = this.currentPoint().possessions.at(-1);
    if (possession == null) throw new Error('Start a possession before adding scenario events.');
    return possession;
  }

  private otherSideId(sideId: string): string {
    const side = this.game.sides.find((candidate) => candidate.id !== sideId);
    if (side == null || !this.game.sides.some((candidate) => candidate.id === sideId)) {
      throw new Error(`Unknown advanced-game side "${sideId}".`);
    }
    return side.id;
  }

  private nextId(kind: string): string {
    const next = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, next);
    return `${this.game.id}-${kind}-${next}`;
  }
}

export function createAdvancedGameScenario(
  options: AdvancedGameFixtureOptions = {},
): AdvancedGameScenarioBuilder {
  return new AdvancedGameScenarioBuilder(options);
}

export interface AdvancedGameTestContextOptions<
  Players extends Record<string, Participant>,
> extends Omit<AdvancedGameFixtureOptions, 'participants' | 'sides' | 'defaultLines'> {
  players: Players;
  sides: [GameSide, GameSide];
  defaultLines?: PointLine[];
}

export interface AdvancedGameTestContext {
  readonly focusSideId: string;
  readonly opponentSideId: string;
  readonly participants: Participant[];
  readonly players: Readonly<Record<string, PlayerRef>>;
  readonly untracked: PlayerRef;
  readonly unknown: PlayerRef;
  fixture(options?: AdvancedGameFixtureOptions): AdvancedTrackedGame;
  scenario(options?: AdvancedGameFixtureOptions): AdvancedGameScenarioBuilder;
  gameFromPoints(points: TrackedPoint[], options?: AdvancedGameFixtureOptions): AdvancedTrackedGame;
  analyticsFromPoints(points: TrackedPoint[], options?: AdvancedGameFixtureOptions): AnalyticsGame;
}

export function defineAdvancedGameTestContext<const Players extends Record<string, Participant>>(
  options: AdvancedGameTestContextOptions<Players>,
): AdvancedGameTestContext {
  const { players, ...fixtureDefaults } = options;
  const participants = Object.values(players);
  const playerRefs: Readonly<Record<string, PlayerRef>> = Object.fromEntries(
    Object.entries(players).map(([name, participant]) => [name, participantRef(participant.id)]),
  );

  function fixture(overrides: AdvancedGameFixtureOptions = {}) {
    return createAdvancedGameFixture({
      ...fixtureDefaults,
      participants,
      ...overrides,
    });
  }

  return {
    focusSideId: options.focusSideId ?? options.sides[0].id,
    opponentSideId: options.sides[1].id,
    participants,
    players: playerRefs,
    untracked: UNTRACKED_PLAYER,
    unknown: UNKNOWN_PLAYER,
    fixture,
    scenario: (overrides = {}) =>
      createAdvancedGameScenario({
        ...fixtureDefaults,
        participants,
        ...overrides,
      }),
    gameFromPoints: (points, overrides = {}) => fixture({ ...overrides, points }),
    analyticsFromPoints: (points, overrides = {}) =>
      buildAnalyticsGame(fixture({ ...overrides, points })),
  };
}

export function validateAdvancedGameFixture(game: AdvancedTrackedGame): void {
  assertTwoSides(game.sides);
  for (const point of game.points) {
    assertValidPointLineHistory(game, point);
    for (const action of point.possessions.flatMap((possession) => possession.actions)) {
      if (action.kind === 'pull') {
        assertValidParticipantRefs(game, [action.puller, action.receiver]);
      } else if (action.kind === 'disc_pickup') {
        assertValidParticipantRefs(game, [action.player]);
      } else if (action.kind === 'throw') {
        assertValidParticipantRefs(game, [action.thrower, action.toPlayer, action.defender]);
      }
    }
  }
  buildAnalyticsGame(game);
}

function pointHasScore(point: TrackedPoint): boolean {
  const action = point.possessions
    .at(-1)
    ?.actions.findLast((candidate) => candidate.kind !== 'stoppage');
  return action?.kind === 'throw' && (action.result === 'goal' || action.result === 'callahan');
}

function getScoringSideId(point: TrackedPoint, sides: GameSide[]): string | null {
  const possession = point.possessions.at(-1);
  const action = possession?.actions.findLast((candidate) => candidate.kind !== 'stoppage');
  if (possession == null || action?.kind !== 'throw') return null;
  if (action.result === 'goal') return possession.sideId;
  if (action.result !== 'callahan') return null;
  return sides.find((side) => side.id !== possession.sideId)?.id ?? null;
}

function cloneFixture<T>(value: T): T {
  return structuredClone(value);
}
