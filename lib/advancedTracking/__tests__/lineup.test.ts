import {
  ADVANCED_TEST_FOCUS_SIDE_ID as FOCUS,
  ADVANCED_TEST_OPPONENT_SIDE_ID as OPPONENT,
  createAdvancedGameScenario,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

import { applySub, getActiveLineIds, reverseSub } from '../lineup';

describe('applySub and reverseSub', () => {
  it('appends sub-ins and restores sub-outs at the first sub-in slot', () => {
    const change = { inIds: ['x'], outIds: ['b'] };
    const activeIds = applySub(['a', 'b', 'c'], change);

    expect(activeIds).toEqual(['a', 'c', 'x']);
    expect(reverseSub(activeIds, change)).toEqual(['a', 'c', 'b']);
  });
});

describe('getActiveLineIds', () => {
  const buildScenario = () =>
    createAdvancedGameScenario({
      participants: ['bob', 'jerry', 'mike', 'john', 'joey', 'chuck', 'opp1', 'opp2'].map((id) => ({
        id,
        name: id,
      })),
      defaultLines: [
        { sideId: FOCUS, participantIds: ['bob', 'jerry', 'mike', 'john'] },
        { sideId: OPPONENT, participantIds: ['opp1'] },
      ],
    }).startPoint({ puller: UNTRACKED_PLAYER });

  it('returns the starting line when there are no subs', () => {
    const point = buildScenario().buildPoint();

    expect(getActiveLineIds(point, FOCUS)).toEqual(['bob', 'jerry', 'mike', 'john']);
  });

  it('applies subs in stoppage order, including a player subbed back in', () => {
    const point = buildScenario()
      .stoppage('injury', { id: 'stop1' })
      .injurySub({ sideId: FOCUS, inIds: ['joey'], outIds: ['bob'] })
      .stoppage('injury', { id: 'stop2' })
      .injurySub({ sideId: FOCUS, inIds: ['bob'], outIds: ['joey'] })
      .buildPoint();

    expect(getActiveLineIds(point, FOCUS)).toEqual(['jerry', 'mike', 'john', 'bob']);
  });

  it('returns the line before a later stoppage for edit diffs', () => {
    const point = buildScenario()
      .stoppage('injury', { id: 'stop1' })
      .injurySub({ sideId: FOCUS, inIds: ['joey'], outIds: ['bob'] })
      .stoppage('injury', { id: 'stop2' })
      .injurySub({ sideId: FOCUS, inIds: ['chuck'], outIds: ['joey'] })
      .buildPoint();

    expect(getActiveLineIds(point, FOCUS)).toEqual(['jerry', 'mike', 'john', 'chuck']);
    expect(getActiveLineIds(point, FOCUS, 'stop2')).toEqual(['jerry', 'mike', 'john', 'joey']);
  });

  it('ignores subs for the other side', () => {
    const point = buildScenario()
      .stoppage('injury', { id: 'stop1' })
      .injurySub({ sideId: OPPONENT, inIds: ['opp2'], outIds: ['opp1'] })
      .buildPoint();

    expect(getActiveLineIds(point, FOCUS)).toEqual(['bob', 'jerry', 'mike', 'john']);
    expect(getActiveLineIds(point, OPPONENT)).toEqual(['opp2']);
  });
});
