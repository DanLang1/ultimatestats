import { useTrackerHandlers } from '@/hooks/advancedTracking/useTrackerHandlers';
import type { CaptureIntentResult } from '@/lib/advancedTracking/captureIntentUtils';
import type { PassModifier, PlayerRef } from '@/lib/advancedTracking/types';

const holder: PlayerRef = { refType: 'participant', participantId: 'light-holder' };
const defender: PlayerRef = { refType: 'participant', participantId: 'dark-defender' };

function makeInput(passModifier: PassModifier, hasHolder = true) {
  return {
    oppHasDisc: false,
    discHolderRef: hasHolder ? holder : null,
    canDropOpeningPull: false,
    caughtPassThrowerRef: null as PlayerRef | null,
    passModifier,
    setPassModifier: jest.fn(),
    recordCaptureIntent: jest.fn((): CaptureIntentResult => ({ ok: true, actionId: 'action' })),
    amendOpeningPullAsDropped: jest.fn(),
    onAskGoalThrower: jest.fn(),
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

  it('maps button-mode goal and drop taps to their capture intents', () => {
    const goalInput = makeInput('goal');
    useTrackerHandlers(goalInput).onPlayerTap(defender);
    expect(goalInput.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'goal', scorer: defender });
    expect(goalInput.setPassModifier).toHaveBeenCalledWith(null);

    const dropInput = makeInput('drop');
    useTrackerHandlers(dropInput).onPlayerTap(defender);
    expect(dropInput.recordCaptureIntent).toHaveBeenCalledWith({
      kind: 'drop',
      receiver: defender,
    });
    expect(dropInput.setPassModifier).toHaveBeenCalledWith(null);
  });

  it('keeps a button-mode drop armed when the capture is rejected', () => {
    const input = makeInput('drop');
    input.recordCaptureIntent.mockReturnValue({ ok: false, reason: 'no-caught-pass' });
    useTrackerHandlers(input).onPlayerTap(holder);
    expect(input.setPassModifier).not.toHaveBeenCalled();
  });

  it('sends a button-mode drop on the holder as the same drop capture', () => {
    const input = makeInput('drop');
    useTrackerHandlers(input).onPlayerTap(holder);
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'drop', receiver: holder });
    expect(input.setPassModifier).toHaveBeenCalledWith(null);
  });

  it('asks who threw a button-mode goal by a holder who just caught a pass', () => {
    const input = { ...makeInput('goal'), caughtPassThrowerRef: defender };
    useTrackerHandlers(input).onPlayerTap(holder);
    expect(input.onAskGoalThrower).toHaveBeenCalled();
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    expect(input.setPassModifier).not.toHaveBeenCalled();
  });

  it('maps a button-mode drop during the opening pull to a dropped pull', () => {
    const input = { ...makeInput('drop', false), canDropOpeningPull: true };
    useTrackerHandlers(input).onPlayerTap(defender);
    expect(input.amendOpeningPullAsDropped).toHaveBeenCalledWith(defender);
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    expect(input.setPassModifier).toHaveBeenCalledWith(null);
  });

  it('maps an awaiting holder tap to pickup', () => {
    const input = makeInput(null, false);
    useTrackerHandlers(input).onPlayerTap(defender);
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'pickup', player: defender });
  });

  it.each<PassModifier>(['goal', 'fifty-fifty'])(
    'clears an armed %s modifier when a goal is swiped instead',
    (passModifier) => {
      const input = makeInput(passModifier);
      useTrackerHandlers(input).onGoal(defender);
      expect(input.recordCaptureIntent).toHaveBeenCalledWith({ kind: 'goal', scorer: defender });
      expect(input.setPassModifier).toHaveBeenCalledWith(null);
    },
  );

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
