import { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import { CaptureIntent, CaptureIntentResult } from '@/lib/advancedTracking/captureIntentUtils';
import { PassModifier, PlayerRef } from '@/lib/advancedTracking/types';

interface UseTrackerHandlersInput {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  discHolderRef: PlayerRef | null;
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
    passModifier,
    setPassModifier,
    recordCaptureIntent,
    amendOpeningPullAsDropped,
  } = input;

  const onPlayerTap = (ref: PlayerRef) => {
    if (pointIsOver) return;
    if (passModifier === 'block') {
      if (!discHolderRef) return;
      recordCaptureIntent({ kind: 'block', defender: ref });
    } else if (passModifier === 'callahan') {
      if (!discHolderRef && !oppHasDisc) return;
      recordCaptureIntent({ kind: 'callahan', scorer: ref });
    } else if (passModifier === 'stall') {
      if (!discHolderRef && !oppHasDisc) return;
      recordCaptureIntent({ kind: 'stall', defender: ref });
    } else if (passModifier === 'pressure') {
      if (!discHolderRef && !oppHasDisc) return;
      recordCaptureIntent({ kind: 'pressure', defender: ref });
    } else if (oppHasDisc) recordCaptureIntent({ kind: 'block', defender: ref });
    else if (discHolderRef == null) {
      recordCaptureIntent({ kind: 'pickup', player: ref });
      return;
    } else if (passModifier === 'fifty-fifty') {
      recordCaptureIntent({ kind: 'fifty-fifty', receiver: ref });
    } else {
      recordCaptureIntent({ kind: 'pass', receiver: ref });
      return;
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
      if (discHolderRef != null && !pointIsOver) recordCaptureIntent({ kind: 'goal', scorer });
    },
    onThrowaway: () => {
      if (discHolderRef == null || pointIsOver) return;
      recordCaptureIntent({ kind: 'throwaway' });
      setPassModifier(null);
    },
  };
}
