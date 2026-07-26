import { useTrackerHandlers } from '@/hooks/advancedTracking/useTrackerHandlers';
import type { PassModifier, PlayerRef, PointPossession } from '@/lib/advancedTracking/types';

const holder: PlayerRef = { refType: 'participant', participantId: 'light-holder' };
const defender: PlayerRef = { refType: 'participant', participantId: 'dark-defender' };

function makeHandlersInput(passModifier: PassModifier, possession: PointPossession | null) {
  return {
    pointIsOver: false,
    oppHasDisc: false,
    possession,
    discHolderRef: possession ? holder : null,
    activeSideId: possession?.sideId ?? 'dark',
    focusSideId: 'light',
    opponentSideId: 'dark',
    tracksBothSides: true,
    getPointElapsedMs: () => 2500,
    passModifier,
    setPassModifier: jest.fn(),
    recordThrow: jest.fn(),
    recordPickup: jest.fn(),
    amendLastThrowAsGoal: jest.fn(),
    amendOpeningPullAsDropped: jest.fn(),
  };
}

describe('useTrackerHandlers scrimmage behavior', () => {
  it('attributes a selected block to the defending player', () => {
    const input = makeHandlersInput('block', {
      id: 'possession',
      sideId: 'light',
      actions: [],
    });
    const handlers = useTrackerHandlers(input);

    handlers.onPlayerTap(defender);

    expect(input.recordThrow).toHaveBeenCalledWith({
      thrower: holder,
      result: 'block',
      defender,
    });
    expect(input.setPassModifier).toHaveBeenCalledWith(null);
  });

  it('starts the next scrimmage possession for the active side', () => {
    const input = makeHandlersInput(null, null);
    const handlers = useTrackerHandlers(input);

    handlers.onPlayerTap(defender);

    expect(input.recordPickup).toHaveBeenCalledWith({ sideId: 'dark', player: defender });
  });

  it('attributes a scrimmage Callahan to the selected defender', () => {
    const input = makeHandlersInput('callahan', {
      id: 'possession',
      sideId: 'light',
      actions: [],
    });
    const handlers = useTrackerHandlers(input);

    handlers.onPlayerTap(defender);

    expect(input.recordThrow).toHaveBeenCalledWith({
      thrower: holder,
      result: 'callahan',
      defender,
      timerElapsedMs: 2500,
    });
  });

  it('attributes scrimmage pressure to the selected defender', () => {
    const input = makeHandlersInput('pressure', {
      id: 'possession',
      sideId: 'light',
      actions: [],
    });
    const handlers = useTrackerHandlers(input);

    handlers.onPlayerTap(defender);

    expect(input.recordThrow).toHaveBeenCalledWith({
      thrower: holder,
      result: 'pressure',
      defender,
    });
    expect(input.setPassModifier).toHaveBeenCalledWith(null);
  });
});

describe('useTrackerHandlers standard game behavior', () => {
  it('records pressure for the selected defender and clears the modifier', () => {
    const pressureDefender: PlayerRef = {
      refType: 'participant',
      participantId: 'defender',
    };
    const possession: PointPossession = {
      id: 'opp-possession',
      sideId: 'dark',
      actions: [],
    };
    const recordThrow = jest.fn();
    const setPassModifier = jest.fn();

    const handlers = useTrackerHandlers({
      pointIsOver: false,
      oppHasDisc: true,
      possession,
      discHolderRef: null,
      activeSideId: 'dark',
      focusSideId: 'light',
      opponentSideId: 'dark',
      tracksBothSides: false,
      getPointElapsedMs: () => 0,
      passModifier: 'pressure',
      setPassModifier,
      recordThrow,
      recordPickup: jest.fn(),
      amendLastThrowAsGoal: jest.fn(),
      amendOpeningPullAsDropped: jest.fn(),
    });

    handlers.onPlayerTap(pressureDefender);

    expect(recordThrow).toHaveBeenCalledWith({
      thrower: { refType: 'untracked' },
      result: 'pressure',
      defender: pressureDefender,
    });
    expect(setPassModifier).toHaveBeenCalledWith(null);
  });
});
