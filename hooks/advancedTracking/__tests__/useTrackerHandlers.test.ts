import { useTrackerHandlers } from '@/hooks/advancedTracking/useTrackerHandlers';
import type { PassModifier, PlayerRef } from '@/lib/advancedTracking/types';

const holder: PlayerRef = { refType: 'participant', participantId: 'light-holder' };
const defender: PlayerRef = { refType: 'participant', participantId: 'dark-defender' };

function makeInput(passModifier: PassModifier, hasHolder = true) {
  return {
    pointIsOver: false,
    oppHasDisc: false,
    discHolderRef: hasHolder ? holder : null,
    passModifier,
    setPassModifier: jest.fn(),
    recordCaptureIntent: jest.fn(),
    amendOpeningPullAsDropped: jest.fn(),
  };
}

describe('useTrackerHandlers', () => {
  it.each([
    ['block', { kind: 'block', defender }],
    ['callahan', { kind: 'callahan', scorer: defender }],
    ['pressure', { kind: 'pressure', defender }],
    ['stall', { kind: 'stall', defender }],
  ] as const)('maps %s to its semantic capture intent', (passModifier, expected) => {
    const input = makeInput(passModifier);
    useTrackerHandlers(input).onPlayerTap(defender);
    expect(input.recordCaptureIntent).toHaveBeenCalledWith(expected);
    expect(input.setPassModifier).toHaveBeenCalledWith(null);
  });

  it('maps an awaiting holder tap to pickup', () => {
    const input = makeInput(null, false);
    useTrackerHandlers(input).onPlayerTap(defender);
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'pickup', player: defender });
  });

  it('maps a regular player tap to pass and a goal tap directly to goal', () => {
    const input = makeInput(null);
    const handlers = useTrackerHandlers(input);
    handlers.onPlayerTap(defender);
    handlers.onGoal(defender);
    expect(input.recordCaptureIntent).toHaveBeenNthCalledWith(1, {
      kind: 'pass',
      receiver: defender,
    });
    expect(input.recordCaptureIntent).toHaveBeenNthCalledWith(2, {
      kind: 'goal',
      scorer: defender,
    });
  });

  it('maps an anonymous opponent pressure without adapter-side pickup sequencing', () => {
    const input = { ...makeInput('pressure', false), oppHasDisc: true };
    useTrackerHandlers(input).onPlayerTap(defender);
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'pressure', defender });
  });
});
