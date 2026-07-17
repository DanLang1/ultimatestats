import type { PlayerRef, PointPossession } from '@/lib/advancedTracking/types';

import { useTrackerHandlers } from '../useTrackerHandlers';

jest.mock('@/app/(main)/advancedTracking/PreGameConfirm', () => ({
  FOCUS_SIDE_ID: 'focus',
  OPP_SIDE_ID: 'opp',
}));

describe('useTrackerHandlers', () => {
  it('records pressure for the selected defender and clears the modifier', () => {
    const defender: PlayerRef = { refType: 'participant', participantId: 'defender' };
    const possession: PointPossession = {
      id: 'opp-possession',
      sideId: 'opp',
      actions: [],
    };
    const recordThrow = jest.fn();
    const setPassModifier = jest.fn();

    const handlers = useTrackerHandlers({
      pointIsOver: false,
      oppHasDisc: true,
      possession,
      discHolderRef: null,
      getPointElapsedMs: () => 0,
      passModifier: 'pressure',
      setPassModifier,
      recordThrow,
      recordPickup: jest.fn(),
      amendLastThrowAsGoal: jest.fn(),
      amendOpeningPullAsDropped: jest.fn(),
    });

    handlers.onPlayerTap(defender);

    expect(recordThrow).toHaveBeenCalledWith({
      thrower: { refType: 'untracked' },
      result: 'pressure',
      defender,
    });
    expect(setPassModifier).toHaveBeenCalledWith(null);
  });
});
