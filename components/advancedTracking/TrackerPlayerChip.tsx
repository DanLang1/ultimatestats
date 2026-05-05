import { PlayerRef } from '@/lib/advancedTracking/types';
import React from 'react';
import { PassModifier } from './types';
import { TrackerChipBase } from './TrackerChipBase';

interface TrackerPlayerChipProps {
  label: string;
  playerRef: PlayerRef;
  discHolderRef: PlayerRef | null;
  oppHasDisc: boolean;
  passModifier: PassModifier;
  onTap: (ref: PlayerRef) => void;
  onDrop: (ref: PlayerRef) => void;
  onGoal: (ref: PlayerRef) => void;
  onThrowaway: () => void;
  chipWidth: number;
}

function isSameRef(a: PlayerRef | null, b: PlayerRef): boolean {
  if (!a) return false;
  if (a.refType === 'participant' && b.refType === 'participant') {
    return a.participantId === b.participantId;
  }
  return a.refType === b.refType;
}

export const TrackerPlayerChip = ({
  label,
  playerRef,
  discHolderRef,
  oppHasDisc,
  passModifier,
  onTap,
  onDrop,
  onGoal,
  onThrowaway,
  chipWidth,
}: TrackerPlayerChipProps) => {
  const isHolder = isSameRef(discHolderRef, playerRef);
  const isTargetable = !oppHasDisc && discHolderRef !== null && !isHolder;

  return (
    <TrackerChipBase
      label={label}
      chipWidth={chipWidth}
      state={{ isHolder, isTargetable, oppHasDisc, passModifier }}
      actions={{
        tap: () => onTap(playerRef),
        throwaway: onThrowaway,
        goal: () => onGoal(playerRef),
        drop: () => onDrop(playerRef),
        oppSwipeDown: () => onTap(playerRef),
      }}
    />
  );
};
