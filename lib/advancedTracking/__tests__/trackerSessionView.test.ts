import { getTrackerSessionView, TrackerSessionView } from '../trackerSessionView';
import { getSafeDiscHolderRef } from '../trackingDisplayHelpers';
import type {
  AdvancedTrackedGame,
  PassModifier,
  PlayerRef,
  PointPossession,
  PossessionAction,
  PullResult,
} from '../types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HOME = 'home';
const AWAY = 'away';

const august: PlayerRef = { refType: 'participant', participantId: 'p_august' };
const meves: PlayerRef = { refType: 'participant', participantId: 'p_meves' };
const untracked: PlayerRef = { refType: 'untracked' };

const singleTeamGame: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: HOME,
  initialReceivingSideId: HOME,
  settings: { locationMode: 'none' },
  sides: [
    { id: HOME, label: 'Home', trackingMode: 'full-roster' },
    { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'p_august', name: 'August' },
    { id: 'p_meves', name: 'Meves' },
  ],
  points: [],
};

const scrimmageGame: AdvancedTrackedGame = {
  ...singleTeamGame,
  gameType: 'scrimmage',
  sides: singleTeamGame.sides.map((side) => ({ ...side, trackingMode: 'full-roster' })),
};

let nextId = 0;
const id = () => `id_${nextId++}`;

const pull = (receivingSideId: string, result: PullResult): PossessionAction => ({
  id: id(),
  kind: 'pull',
  sideId: receivingSideId === HOME ? AWAY : HOME,
  receivingSideId,
  puller: untracked,
  result,
});
const pickup = (sideId: string, player: PlayerRef): PossessionAction => ({
  id: id(),
  kind: 'disc_pickup',
  sideId,
  player,
});
const throwaway = (sideId: string, thrower: PlayerRef): PossessionAction => ({
  id: id(),
  kind: 'throw',
  sideId,
  thrower,
  result: 'throwaway',
});
const goal = (sideId: string, thrower: PlayerRef, toPlayer: PlayerRef): PossessionAction => ({
  id: id(),
  kind: 'throw',
  sideId,
  thrower,
  toPlayer,
  result: 'goal',
});
const timeout = (sideId: string): PossessionAction => ({
  id: id(),
  kind: 'stoppage',
  reason: 'timeout',
  sideId,
  pausedAt: 1,
});

const possession = (sideId: string, actions: PossessionAction[]): PointPossession => ({
  id: id(),
  sideId,
  actions,
});

function withPossessions(
  game: AdvancedTrackedGame,
  possessions: PointPossession[],
): AdvancedTrackedGame {
  return { ...game, points: [{ id: 'pt1', lines: [], possessions }] };
}

// ── Scenarios ────────────────────────────────────────────────────────────────

type Expected = Partial<Omit<TrackerSessionView, 'game' | 'point' | 'possession'>>;

interface Scenario {
  name: string;
  game: AdvancedTrackedGame;
  passModifier?: PassModifier;
  expected: Expected;
}

const singleTeamScenarios: Scenario[] = [
  {
    name: 'pre-pull (no points)',
    game: singleTeamGame,
    expected: {
      pointIsOver: false,
      oppHasDisc: false,
      activeSideId: HOME,
      perspectiveSideId: HOME,
      displaySideId: HOME,
      discHolderRef: null,
      canDropOpeningPull: false,
      isPlayLive: true,
      canUseVoice: false,
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    name: 'opening pull received',
    game: withPossessions(singleTeamGame, [possession(HOME, [pull(HOME, 'inbound')])]),
    expected: {
      oppHasDisc: false,
      discHolderRef: null,
      canDropOpeningPull: true,
      canUseVoice: false,
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    name: 'received pull marked dropped',
    game: withPossessions(singleTeamGame, [possession(HOME, [pull(HOME, 'dropped')])]),
    expected: {
      activeSideId: AWAY,
      perspectiveSideId: HOME,
      oppHasDisc: true,
      discHolderRef: null,
      canDropOpeningPull: false,
      canUseRareMenu: true,
      footerMode: { kind: 'defense', hidden: false },
    },
  },
  {
    name: 'opponent-dropped pull',
    game: withPossessions(singleTeamGame, [possession(AWAY, [pull(AWAY, 'dropped')])]),
    expected: {
      activeSideId: HOME,
      oppHasDisc: false,
      discHolderRef: null,
      canDropOpeningPull: false,
      canUseVoice: false,
      canUseRareMenu: false,
      footerMode: { kind: 'pickup', hidden: false },
    },
  },
  {
    name: 'mid-point pickup after an opponent turnover',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), throwaway(HOME, august)]),
      possession(AWAY, [pickup(AWAY, untracked), throwaway(AWAY, untracked)]),
    ]),
    expected: {
      activeSideId: HOME,
      oppHasDisc: false,
      discHolderRef: null,
      canUseRareMenu: false,
      footerMode: { kind: 'pickup', hidden: false },
    },
  },
  {
    name: 'offense with a holder',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    expected: {
      oppHasDisc: false,
      discHolderRef: august,
      canDropOpeningPull: false,
      canUseVoice: true,
      canUseRareMenu: true,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    name: 'offense with Goal armed',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    passModifier: 'goal',
    expected: {
      displaySideId: HOME,
      discHolderRef: august,
      canUseVoice: false,
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: true },
    },
  },
  {
    name: 'offense with Drop armed',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    passModifier: 'drop',
    expected: {
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: true },
    },
  },
  {
    name: 'offense with a rare-menu modifier armed',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    passModifier: 'fifty-fifty',
    expected: {
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: true },
    },
  },
  {
    name: 'defense',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), throwaway(HOME, august)]),
    ]),
    expected: {
      activeSideId: AWAY,
      perspectiveSideId: HOME,
      displaySideId: HOME,
      oppHasDisc: true,
      discHolderRef: null,
      canUseVoice: false,
      canUseRareMenu: true,
      footerMode: { kind: 'defense', hidden: false },
    },
  },
  {
    name: 'defense with an armed modifier',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), throwaway(HOME, august)]),
    ]),
    passModifier: 'pressure',
    expected: {
      canUseRareMenu: false,
      displaySideId: HOME,
      oppHasDisc: true,
      footerMode: { kind: 'defense', hidden: true },
    },
  },
  {
    name: 'active timeout with a holder',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), timeout(HOME)]),
    ]),
    expected: {
      discHolderRef: august,
      canUseVoice: false,
      canUseRareMenu: true,
      isPlayLive: false,
      footerMode: null,
    },
  },
  {
    name: 'point over',
    game: withPossessions(singleTeamGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), goal(HOME, august, meves)]),
    ]),
    expected: {
      pointIsOver: true,
      oppHasDisc: false,
      perspectiveSideId: HOME,
      discHolderRef: null,
      canUseVoice: false,
      canUseRareMenu: false,
      isPlayLive: false,
      footerMode: null,
    },
  },
];

const scrimmageScenarios: Scenario[] = [
  {
    name: 'pre-pull (no points)',
    game: scrimmageGame,
    expected: {
      tracksBothSides: true,
      activeSideId: HOME,
      perspectiveSideId: HOME,
      displaySideId: HOME,
      discHolderRef: null,
      canUseRareMenu: false,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    name: 'opening pull received',
    game: withPossessions(scrimmageGame, [possession(AWAY, [pull(AWAY, 'inbound')])]),
    expected: {
      activeSideId: AWAY,
      perspectiveSideId: AWAY,
      displaySideId: AWAY,
      oppHasDisc: false,
      canDropOpeningPull: true,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    // The pulling side must now pick up; nobody can mark the pull dropped again.
    name: 'received pull marked dropped',
    game: withPossessions(scrimmageGame, [possession(AWAY, [pull(AWAY, 'dropped')])]),
    expected: {
      activeSideId: HOME,
      perspectiveSideId: HOME,
      displaySideId: HOME,
      oppHasDisc: false,
      discHolderRef: null,
      canDropOpeningPull: false,
      footerMode: { kind: 'pickup', hidden: false },
    },
  },
  {
    name: 'mid-point pickup after a turnover',
    game: withPossessions(scrimmageGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), throwaway(HOME, august)]),
    ]),
    expected: {
      activeSideId: AWAY,
      perspectiveSideId: AWAY,
      displaySideId: AWAY,
      oppHasDisc: false,
      discHolderRef: null,
      canUseRareMenu: false,
      footerMode: { kind: 'pickup', hidden: false },
    },
  },
  {
    name: 'offense with a holder on the other side',
    game: withPossessions(scrimmageGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), throwaway(HOME, august)]),
      possession(AWAY, [pickup(AWAY, meves)]),
    ]),
    expected: {
      activeSideId: AWAY,
      perspectiveSideId: AWAY,
      displaySideId: AWAY,
      discHolderRef: meves,
      canUseVoice: true,
      canUseRareMenu: true,
      footerMode: { kind: 'offense', hidden: false },
    },
  },
  {
    name: 'offensive modifier keeps the holding side on the grid',
    game: withPossessions(scrimmageGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    passModifier: 'drop',
    expected: {
      displaySideId: HOME,
      canUseVoice: false,
      footerMode: { kind: 'offense', hidden: true },
    },
  },
  {
    name: 'defensive modifier shows the defending side on the grid',
    game: withPossessions(scrimmageGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
    ]),
    passModifier: 'block',
    expected: {
      activeSideId: HOME,
      perspectiveSideId: HOME,
      displaySideId: AWAY,
      discHolderRef: august,
      footerMode: { kind: 'offense', hidden: true },
    },
  },
  {
    name: 'point over keeps the scoring side as perspective',
    game: withPossessions(scrimmageGame, [
      possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august), goal(HOME, august, meves)]),
    ]),
    expected: {
      pointIsOver: true,
      activeSideId: AWAY,
      perspectiveSideId: HOME,
      discHolderRef: null,
      canUseRareMenu: false,
      isPlayLive: false,
      footerMode: null,
    },
  },
];

function viewOf({ game, passModifier = null }: Scenario) {
  return getTrackerSessionView(game, { passModifier, lastUndoEntry: undefined });
}

describe('getTrackerSessionView', () => {
  describe('single-team tracking', () => {
    it.each(singleTeamScenarios.map((scenario) => [scenario.name, scenario] as const))(
      '%s',
      (_name, scenario) => {
        const view = viewOf(scenario);
        expect(view).toMatchObject(scenario.expected);
        expect(view.tracksBothSides).toBe(false);
      },
    );
  });

  describe('scrimmage (both sides tracked)', () => {
    it.each(scrimmageScenarios.map((scenario) => [scenario.name, scenario] as const))(
      '%s',
      (_name, scenario) => {
        const view = viewOf(scenario);
        expect(view).toMatchObject(scenario.expected);
        expect(view.oppHasDisc).toBe(false);
      },
    );
  });

  // The tracker screen and rare menu used to resolve the holder from the possession's own side
  // rather than the display perspective. The two only differ after a possession-ending action,
  // where neither side has a holder.
  it.each(
    [...singleTeamScenarios, ...scrimmageScenarios].map(
      (scenario) => [scenario.name, scenario] as const,
    ),
  )('resolves the same holder as the possession side for %s', (_name, scenario) => {
    const {
      game,
      point,
      possession: currentPossession,
      tracksBothSides,
      discHolderRef,
    } = viewOf(scenario);
    const possessionSideId = tracksBothSides
      ? (currentPossession?.sideId ?? game.focusSideId)
      : game.focusSideId;

    expect(discHolderRef).toEqual(getSafeDiscHolderRef(currentPossession, possessionSideId, point));
  });
});

describe('session commands', () => {
  const offense = withPossessions(singleTeamGame, [
    possession(HOME, [pull(HOME, 'inbound'), pickup(HOME, august)]),
  ]);
  const changeLineWith = (passModifier: PassModifier) =>
    getTrackerSessionView(offense, { passModifier, lastUndoEntry: undefined }).commands.changeLine;

  it('hides line changes while a modifier owns the next tap', () => {
    expect(changeLineWith(null)).toBe(true);
    expect(changeLineWith('goal')).toBe(false);
  });
});
