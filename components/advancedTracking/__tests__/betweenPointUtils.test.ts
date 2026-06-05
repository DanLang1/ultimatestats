import { getPointDetails } from '../betweenPointUtils';
import type { PossessionAction } from '@/lib/advancedTracking/types';

const ZOO = 'zoo';
const RIVALS = 'rivals';
const untracked = { refType: 'untracked' as const };
const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };

describe('getPointDetails', () => {
  it('does not count an immediate opponent goal after the pull as a focus-side pass', () => {
    const actions: PossessionAction[] = [
      {
        id: 'pull1',
        kind: 'pull',
        sideId: ZOO,
        receivingSideId: RIVALS,
        puller: august,
        receiver: untracked,
        result: 'inbound',
      },
      {
        id: 'goal1',
        kind: 'throw',
        sideId: RIVALS,
        thrower: untracked,
        toPlayer: untracked,
        result: 'goal',
      },
    ];

    expect(getPointDetails(actions, ZOO)).toEqual({ passCount: 0, turnCount: 0 });
  });

  it('counts focus-side completed throws and goals as passes', () => {
    const actions: PossessionAction[] = [
      {
        id: 'pull1',
        kind: 'pull',
        sideId: RIVALS,
        receivingSideId: ZOO,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      },
      { id: 'pickup1', kind: 'disc_pickup', sideId: ZOO, player: august },
      {
        id: 'throw1',
        kind: 'throw',
        sideId: ZOO,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 'goal1',
        kind: 'throw',
        sideId: ZOO,
        thrower: meves,
        toPlayer: august,
        result: 'goal',
      },
    ];

    expect(getPointDetails(actions, ZOO)).toEqual({ passCount: 2, turnCount: 0 });
  });
});
