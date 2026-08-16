import type { CaptureIntent } from './captureIntentUtils';

/** Voice deliberately keeps a stricter pass contract than touch capture. */
export function planVoicePassIntent(
  throwerParticipantId: string,
  receiverParticipantId: string,
): { ok: true; intent: CaptureIntent } | { ok: false; reason: 'receiver-is-holder' } {
  if (throwerParticipantId === receiverParticipantId)
    return { ok: false, reason: 'receiver-is-holder' };
  return {
    ok: true,
    intent: {
      kind: 'pass',
      receiver: { refType: 'participant', participantId: receiverParticipantId },
    },
  };
}
