import { TrackerPlayerGridHandlers } from '@/components/advancedTracking/TrackerPlayerGrid';
import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { PassModifier, PlayerRef, PointPossession } from '@/lib/advancedTracking/types';

interface UseTrackerHandlersInput {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  possession: PointPossession | null;
  discHolderRef: PlayerRef | null;
  activeSideId: string;
  focusSideId: string;
  opponentSideId: string;
  tracksBothSides: boolean;
  getPointElapsedMs: () => number;
  passModifier: PassModifier;
  setPassModifier: (m: PassModifier) => void;
  recordThrow: (input: {
    thrower: PlayerRef;
    result:
      | 'complete'
      | 'drop'
      | 'block'
      | 'pressure'
      | 'stall'
      | 'throwaway'
      | 'callahan'
      | 'goal';
    toPlayer?: PlayerRef;
    defender?: PlayerRef;
    splitAttribution?: boolean;
    timerElapsedMs?: number;
  }) => void;
  recordPickup: (input: { sideId: string; player: PlayerRef }) => void;
  amendLastThrowAsGoal: (timerElapsedMs?: number) => void;
  amendOpeningPullAsDropped: (receiver: PlayerRef) => void;
}

export function useTrackerHandlers(input: UseTrackerHandlersInput): TrackerPlayerGridHandlers {
  const {
    pointIsOver,
    oppHasDisc,
    possession,
    discHolderRef,
    activeSideId,
    focusSideId,
    opponentSideId,
    tracksBothSides,
    getPointElapsedMs,
    passModifier,
    setPassModifier,
    recordThrow,
    recordPickup,
    amendLastThrowAsGoal,
    amendOpeningPullAsDropped,
  } = input;

  const onPlayerTap = (ref: PlayerRef) => {
    if (pointIsOver) return;

    if (passModifier === 'block') {
      if (!discHolderRef) return;
      recordThrow({ thrower: discHolderRef, result: 'block', defender: ref });
      setPassModifier(null);
      return;
    }

    if (passModifier === 'callahan') {
      if (tracksBothSides) {
        if (!discHolderRef) return;
        recordThrow({
          thrower: discHolderRef,
          result: 'callahan',
          defender: ref,
          timerElapsedMs: getPointElapsedMs(),
        });
        setPassModifier(null);
        return;
      }
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: opponentSideId, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'callahan',
        toPlayer: ref,
        timerElapsedMs: getPointElapsedMs(),
      });
      setPassModifier(null);
      return;
    }

    if (passModifier === 'stall') {
      if (tracksBothSides) {
        if (!discHolderRef) return;
        recordThrow({ thrower: discHolderRef, result: 'stall', defender: ref });
        setPassModifier(null);
        return;
      }
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: opponentSideId, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'stall',
        defender: ref,
      });
      setPassModifier(null);
      return;
    }

    if (passModifier === 'pressure') {
      if (tracksBothSides) {
        if (!discHolderRef) return;
        recordThrow({
          thrower: discHolderRef,
          result: 'pressure',
          defender: ref,
        });
        setPassModifier(null);
        return;
      }
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: opponentSideId, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'pressure',
        defender: ref,
      });
      setPassModifier(null);
      return;
    }

    if (oppHasDisc) {
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: opponentSideId, player: { refType: 'untracked' } });
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
      recordPickup({ sideId: tracksBothSides ? activeSideId : focusSideId, player: ref });
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

  const onPullDrop = (ref: PlayerRef) => {
    if (pointIsOver || discHolderRef !== null || oppHasDisc) return;
    amendOpeningPullAsDropped(ref);
    setPassModifier(null);
  };

  const onGoal = (ref: PlayerRef) => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      toPlayer: ref,
      result: 'complete',
    });
    amendLastThrowAsGoal(getPointElapsedMs());
  };

  const onThrowaway = () => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      result: 'throwaway',
    });
    setPassModifier(null);
  };

  return { onPlayerTap, onDrop, onPullDrop, onGoal, onThrowaway };
}
