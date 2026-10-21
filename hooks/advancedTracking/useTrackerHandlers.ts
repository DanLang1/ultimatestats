import { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import { CaptureIntent, CaptureIntentResult } from '@/lib/advancedTracking/captureIntentUtils';
import { isSamePlayerRef } from '@/lib/advancedTracking/participantUtils';
import { PassModifier, PlayerRef } from '@/lib/advancedTracking/types';
import { assertNever } from '@/lib/utils';

interface UseTrackerHandlersInput {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  discHolderRef: PlayerRef | null;
  canDropOpeningPull: boolean;
  passModifier: PassModifier;
  setPassModifier: (modifier: PassModifier) => void;
  recordCaptureIntent: (intent: CaptureIntent) => CaptureIntentResult;
  amendOpeningPullAsDropped: (receiver: PlayerRef) => void;
}

/** Maps tracker gestures to semantic captures; the store resolves the live possession and holder. */
export function useTrackerHandlers(input: UseTrackerHandlersInput): TrackerPlayerGridHandlers {
  const {
    pointIsOver,
    oppHasDisc,
    discHolderRef,
    canDropOpeningPull,
    passModifier,
    setPassModifier,
    recordCaptureIntent,
    amendOpeningPullAsDropped,
  } = input;

  const onPlayerTap = (ref: PlayerRef) => {
    if (pointIsOver) return;
    const hasDiscInPlay = discHolderRef != null || oppHasDisc;
    switch (passModifier) {
      case 'goal':
        if (discHolderRef == null) return;
        recordCaptureIntent({ kind: 'goal', scorer: ref });
        break;
      case 'drop':
        if (canDropOpeningPull) {
          amendOpeningPullAsDropped(ref);
        } else {
          if (discHolderRef == null || isSamePlayerRef(discHolderRef, ref)) return;
          recordCaptureIntent({ kind: 'drop', receiver: ref });
        }
        break;
      case 'block':
        if (discHolderRef == null) return;
        recordCaptureIntent({ kind: 'block', defender: ref });
        break;
      case 'callahan':
        if (!hasDiscInPlay) return;
        recordCaptureIntent({ kind: 'callahan', scorer: ref });
        break;
      case 'stall':
        if (!hasDiscInPlay) return;
        recordCaptureIntent({ kind: 'stall', defender: ref });
        break;
      case 'pressure':
        if (!hasDiscInPlay) return;
        recordCaptureIntent({ kind: 'pressure', defender: ref });
        break;
      case 'fifty-fifty':
      case null:
        if (oppHasDisc) {
          recordCaptureIntent({ kind: 'block', defender: ref });
        } else if (discHolderRef == null) {
          recordCaptureIntent({ kind: 'pickup', player: ref });
          return;
        } else if (passModifier === 'fifty-fifty') {
          recordCaptureIntent({ kind: 'fifty-fifty', receiver: ref });
        } else {
          recordCaptureIntent({ kind: 'pass', receiver: ref });
          return;
        }
        break;
      default:
        assertNever(passModifier, 'Unsupported pass modifier');
    }
    setPassModifier(null);
  };

  return {
    onPlayerTap,
    onDrop: (receiver) => {
      if (discHolderRef == null || pointIsOver) return;
      recordCaptureIntent({ kind: 'drop', receiver });
      setPassModifier(null);
    },
    onPullDrop: (receiver) => {
      if (pointIsOver || discHolderRef != null || oppHasDisc) return;
      amendOpeningPullAsDropped(receiver);
      setPassModifier(null);
    },
    onGoal: (scorer) => {
      if (discHolderRef == null || pointIsOver) return;
      recordCaptureIntent({ kind: 'goal', scorer });
      setPassModifier(null);
    },
    onThrowaway: () => {
      if (discHolderRef == null || pointIsOver) return;
      recordCaptureIntent({ kind: 'throwaway' });
      setPassModifier(null);
    },
  };
}
