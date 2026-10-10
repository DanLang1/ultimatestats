import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGameStore } from '@/store/basic/gameStore';
import type { GameEvent } from '@/store/basic/gameStore.types';
import { createSavedBasicGame } from '@/test/fixtures/domain';

type EventUpdates = Parameters<ReturnType<typeof useGameStore.getState>['updateEvent']>[1] & {
  team?: 'team1' | 'team2';
};

const goal: GameEvent = {
  type: 'goal',
  team: 'team1',
  goalPlayerId: 'scorer',
  assistPlayerId: 'assist',
  elapsedMs: 1200,
};
const turnover: GameEvent = {
  type: 'turnover',
  team: 'team1',
  subtype: 'throwaway',
  playerId: 'thrower',
  elapsedMs: 500,
};
const timeout: GameEvent = {
  type: 'timeout',
  team: 'team2',
  index: 0,
  isFloater: false,
  elapsedMs: 800,
};
const savedGameId = 'saved-basic-game-1';

const eventOwners = [
  {
    name: 'live',
    arrange: async (events: GameEvent[]) => {
      await useGameStore.setState({ events });
    },
    read: () => useGameStore.getState().events,
    update: (index: number, updates: EventUpdates) =>
      useGameStore.getState().updateEvent(index, updates),
    remove: (index: number) => useGameStore.getState().deleteEvent(index),
  },
  {
    name: 'saved',
    arrange: async (events: GameEvent[]) => {
      await useGameStore.setState({ savedGames: [{ ...createSavedBasicGame(), events }] });
    },
    read: () => useGameStore.getState().savedGames[0].events,
    update: (index: number, updates: EventUpdates) =>
      useGameStore.getState().updateSavedGameEvent(savedGameId, index, updates),
    remove: (index: number) => useGameStore.getState().deleteSavedGameEvent(savedGameId, index),
  },
];

describe.each(eventOwners)('$name event corrections', (owner) => {
  beforeEach(async () => {
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    await useGameStore.setState(useGameStore.getInitialState(), true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('corrects turnover attribution and subtype without changing neighboring events', async () => {
    await owner.arrange([timeout, turnover, goal]);
    await owner.update(1, {
      playerId: 'receiver',
      player2Id: 'contender',
      subtype: 'fiftyfifty',
      team: 'team2',
      elapsedMs: 600,
    });
    expect(owner.read()).toEqual([
      timeout,
      {
        ...turnover,
        playerId: 'receiver',
        player2Id: 'contender',
        subtype: 'fiftyfifty',
        team: 'team2',
        elapsedMs: 600,
      },
      goal,
    ]);
    await owner.update(1, { playerId: null, player2Id: null });
    expect(owner.read()[1]).toMatchObject({
      playerId: null,
      player2Id: null,
      subtype: 'fiftyfifty',
      team: 'team2',
      elapsedMs: 600,
    });
  });

  it('updates the Callahan block when correcting its scorer', async () => {
    const block: GameEvent = { ...turnover, subtype: 'block', playerId: 'old-scorer' };
    const callahan: GameEvent = {
      ...goal,
      goalPlayerId: 'old-scorer',
      assistPlayerId: 'OTHER_TEAM',
    };
    await owner.arrange([timeout, block, callahan]);
    await owner.update(2, { goalPlayerId: 'new-scorer' });
    expect(owner.read()).toEqual([
      timeout,
      { ...block, playerId: 'new-scorer' },
      { ...callahan, goalPlayerId: 'new-scorer' },
    ]);
  });

  it.each([turnover, timeout])(
    'does not change an unrelated event before a Callahan (%j)',
    async (previous) => {
      const callahan: GameEvent = { ...goal, assistPlayerId: 'OTHER_TEAM' };
      await owner.arrange([previous, callahan]);
      await owner.update(1, { goalPlayerId: null, assistPlayerId: null });
      expect(owner.read()).toEqual([
        previous,
        { ...callahan, goalPlayerId: null, assistPlayerId: null },
      ]);
    },
  );

  it('corrects ordinary goal attribution and a first-event Callahan without requiring a block', async () => {
    await owner.arrange([goal]);
    await owner.update(0, { goalPlayerId: 'corrected', assistPlayerId: 'OTHER_TEAM' });
    await owner.update(0, { goalPlayerId: null });
    expect(owner.read()).toEqual([{ ...goal, goalPlayerId: null, assistPlayerId: 'OTHER_TEAM' }]);
  });

  it.each([goal, turnover, timeout])('sets and removes timing for %j', async (event) => {
    await owner.arrange([event]);
    await owner.update(0, { elapsedMs: 0 });
    expect(owner.read()[0].elapsedMs).toBe(0);
    await owner.update(0, { elapsedMs: null });
    expect(owner.read()[0]).not.toHaveProperty('elapsedMs');
  });

  it('protects goals from deletion while allowing turnover and timeout corrections', async () => {
    await owner.arrange([turnover, timeout, goal]);
    await expect(Promise.resolve(owner.remove(2))).resolves.toBe(false);
    await expect(Promise.resolve(owner.remove(0))).resolves.toBe(true);
    expect(owner.read()).toEqual([timeout, goal]);
    await expect(Promise.resolve(owner.remove(0))).resolves.toBe(true);
    expect(owner.read()).toEqual([goal]);
  });

  it('ignores stale event indices', async () => {
    await owner.arrange([goal]);
    await owner.update(4, { goalPlayerId: 'wrong' });
    await expect(Promise.resolve(owner.remove(-1))).resolves.toBe(false);
    expect(owner.read()).toEqual([goal]);
  });
});

describe('saved event persistence', () => {
  beforeEach(async () => {
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    await useGameStore.setState(
      {
        ...useGameStore.getInitialState(),
        savedGames: [{ ...createSavedBasicGame(), events: [turnover] }],
      },
      true,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [
      'edit',
      () => useGameStore.getState().updateSavedGameEvent(savedGameId, 0, { playerId: 'corrected' }),
    ],
    ['delete', () => useGameStore.getState().deleteSavedGameEvent(savedGameId, 0)],
  ] as const)('awaits the %s write and propagates persistence failure', async (_name, mutate) => {
    let finishWrite!: () => void;
    jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    let resolved = false;
    const pending = mutate().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    finishWrite();
    await pending;
    expect(resolved).toBe(true);

    await useGameStore.setState({
      savedGames: [{ ...createSavedBasicGame(), events: [turnover] }],
    });
    const error = new Error('Storage unavailable');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(error);
    await expect(mutate()).rejects.toBe(error);
  });

  it('does not edit or delete events in a missing saved game', async () => {
    await useGameStore.getState().updateSavedGameEvent('missing', 0, { playerId: 'wrong' });
    await expect(useGameStore.getState().deleteSavedGameEvent('missing', 0)).resolves.toBe(false);
    expect(useGameStore.getState().savedGames[0].events).toEqual([turnover]);
  });
});
