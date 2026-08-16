import { planVoicePassIntent } from '../voiceCaptureIntentUtils';

describe('planVoicePassIntent', () => {
  it('converts a distinct receiver to the shared pass intent', () => {
    expect(planVoicePassIntent('thrower', 'receiver')).toEqual({
      ok: true,
      intent: { kind: 'pass', receiver: { refType: 'participant', participantId: 'receiver' } },
    });
  });

  it('keeps voice-only self-pass rejection outside the shared capture command', () => {
    expect(planVoicePassIntent('holder', 'holder')).toEqual({
      ok: false,
      reason: 'receiver-is-holder',
    });
  });
});
