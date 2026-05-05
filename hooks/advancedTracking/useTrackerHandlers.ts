import { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import { PassModifier, PlayerRef, PointPossession } from '@/lib/advancedTracking/types';
import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { FOCUS_SIDE_ID, OPP_SIDE_ID } from '@/app/(main)/advancedTracking/PreGameConfirm';

interface UseTrackerHandlersInput {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  possession: PointPossession | null;
  discHolderRef: PlayerRef | null;
  pointElapsedMs: number;
  passModifier: PassModifier;
  setPassModifier: (m: PassModifier) => void;
  recordThrow: (input: {
    thrower: PlayerRef;
    result: 'complete' | 'drop' | 'block' | 'stall' | 'throwaway' | 'callahan' | 'goal';
    toPlayer?: PlayerRef;
    defender?: PlayerRef;
    splitAttribution?: boolean;
    timerElapsedMs?: number;
  }) => void;
  recordPickup: (input: { sideId: string; player: PlayerRef }) => void;
  amendLastThrowAsGoal: (timerElapsedMs?: number) => void;
}

export function useTrackerHandlers(input: UseTrackerHandlersInput): TrackerPlayerGridHandlers {
  const {
    pointIsOver,
    oppHasDisc,
    possession,
    discHolderRef,
    pointElapsedMs,
    passModifier,
    setPassModifier,
    recordThrow,
    recordPickup,
    amendLastThrowAsGoal,
  } = input;

  const onPlayerTap = (ref: PlayerRef) => {
    if (pointIsOver) return;

    if (passModifier === 'callahan') {
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'callahan',
        toPlayer: ref,
        timerElapsedMs: pointElapsedMs,
      });
      setPassModifier(null);
      return;
    }

    if (passModifier === 'stall') {
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'stall',
        defender: ref,
      });
      setPassModifier(null);
      return;
    }

    if (oppHasDisc) {
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'block',
        defender: ref,
      });
      setPassModifier(null);
      return;
    }

    if (!possession || isPossessionOver(possession) || discHolderRef === null) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: ref });
      return;
    }

    if (passModifier === 'fifty-fifty') {
      recordThrow({
        thrower: discHolderRef,
        toPlayer: ref,
        result: 'drop',
        splitAttribution: true,
      });
      setPassModifier(null);
      return;
    }

    recordThrow({
      thrower: discHolderRef,
      toPlayer: ref,
      result: 'complete',
    });
  };

  const onDrop = (ref: PlayerRef) => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      toPlayer: ref,
      result: 'drop',
    });
    setPassModifier(null);
  };

  const onGoal = (ref: PlayerRef) => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      toPlayer: ref,
      result: 'complete',
    });
    amendLastThrowAsGoal(pointElapsedMs);
  };

  const onThrowaway = () => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      result: 'throwaway',
    });
    setPassModifier(null);
  };

  return { onPlayerTap, onDrop, onGoal, onThrowaway };
}
