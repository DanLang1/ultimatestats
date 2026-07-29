import { replaceSubsForStoppage, withAppendedStoppage } from '../injurySubUtils';
import type { StoppageAction, TrackedPoint } from '../types';

function makePoint(): TrackedPoint {
  return {
    id: 'point-1',
    lines: [
      { sideId: 'light', participantIds: ['light-1'] },
      { sideId: 'dark', participantIds: ['dark-1'] },
    ],
    possessions: [
      { id: 'possession-1', sideId: 'light', actions: [] },
      { id: 'possession-2', sideId: 'dark', actions: [] },
    ],
  };
}

describe('injurySubUtils', () => {
  it('replaces one stoppage group in place and preserves existing side record IDs', () => {
    const point = makePoint();
    point.subs = [
      {
        id: 'earlier-light',
        sideId: 'light',
        type: 'injury',
        inIds: ['light-2'],
        outIds: ['light-1'],
        stoppageActionId: 'earlier-stoppage',
      },
      {
        id: 'active-light',
        sideId: 'light',
        type: 'injury',
        inIds: ['light-3'],
        outIds: ['light-2'],
        stoppageActionId: 'active-stoppage',
      },
      {
        id: 'active-dark',
        sideId: 'dark',
        type: 'injury',
        inIds: ['dark-2'],
        outIds: ['dark-1'],
        stoppageActionId: 'active-stoppage',
      },
      {
        id: 'later-dark',
        sideId: 'dark',
        type: 'injury',
        inIds: ['dark-3'],
        outIds: ['dark-2'],
        stoppageActionId: 'later-stoppage',
      },
    ];

    const result = replaceSubsForStoppage(point, 'active-stoppage', [
      {
        sideId: 'light',
        inIds: [],
        outIds: [],
      },
      {
        sideId: 'dark',
        inIds: ['dark-4'],
        outIds: ['dark-1'],
      },
    ]);

    expect(result?.map((sub) => sub.id)).toEqual(['earlier-light', 'active-dark', 'later-dark']);
    expect(result?.[1]).toMatchObject({
      sideId: 'dark',
      inIds: ['dark-4'],
      outIds: ['dark-1'],
      stoppageActionId: 'active-stoppage',
    });
    expect(point.subs).toHaveLength(4);
  });

  it('returns undefined when removing the only stoppage group', () => {
    const point = makePoint();
    point.subs = [
      {
        id: 'active-light',
        sideId: 'light',
        type: 'injury',
        inIds: ['light-2'],
        outIds: ['light-1'],
        stoppageActionId: 'active-stoppage',
      },
    ];

    expect(replaceSubsForStoppage(point, 'active-stoppage', [])).toBeUndefined();
  });

  it('appends a stoppage to only the selected possession without mutating the point', () => {
    const point = makePoint();
    const stoppage: StoppageAction = {
      id: 'injury-stoppage',
      kind: 'stoppage',
      reason: 'injury',
      sideId: 'light',
      pausedAt: 100,
    };

    const result = withAppendedStoppage(point, 'possession-2', stoppage);

    expect(result.possessions[0].actions).toEqual([]);
    expect(result.possessions[1].actions).toEqual([stoppage]);
    expect(point.possessions[1].actions).toEqual([]);
  });
});
