import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant, PlayerRef } from '@/lib/advancedTracking/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TrackerPlayerChip } from './TrackerPlayerChip';
import { PassModifier } from './types';

export interface TrackerPlayerGridHandlers {
  onPlayerTap: (ref: PlayerRef) => void;
  onDrop: (ref: PlayerRef) => void;
  onGoal: (ref: PlayerRef) => void;
  onThrowaway: () => void;
}

interface TrackerPlayerGridProps {
  activeParticipants: Participant[];
  discHolderRef: PlayerRef | null;
  oppHasDisc: boolean;
  passModifier: PassModifier;
  handlers: TrackerPlayerGridHandlers;
  availableWidth?: number;
}

function getChipModel(item: Participant | 'unknown'): {
  label: string;
  playerRef: PlayerRef;
  key: string;
} {
  if (item === 'unknown') {
    return { label: 'Unknown', playerRef: { refType: 'unknown' }, key: 'unknown' };
  }
  return {
    label: item.name,
    playerRef: { refType: 'participant', participantId: item.id },
    key: item.id,
  };
}

export const TrackerPlayerGrid = ({
  activeParticipants,
  discHolderRef,
  oppHasDisc,
  passModifier,
  handlers,
  availableWidth,
}: TrackerPlayerGridProps) => {
  const { width, sizeClass, isLandscape } = useLayout();

  const columns = isLandscape ? 4 : 3;
  const hPadding = scaleBySizeClass(24, sizeClass) * 2;
  const gap = scaleBySizeClass(12, sizeClass);
  const chipWidth = Math.floor(
    ((availableWidth ?? width) - hPadding - gap * (columns - 1)) / columns,
  );

  const styles = createStyles(sizeClass, isLandscape);

  const items: (Participant | 'unknown' | null)[] = [...activeParticipants, 'unknown'];
  while (items.length % columns !== 0) {
    items.push(null);
  }

  return (
    <View style={styles.gridContainer}>
      {items.map((item, i) => {
        if (item === null) {
          return <View key={`placeholder-${i}`} style={{ width: chipWidth, aspectRatio: 1 }} />;
        }

        const chip = getChipModel(item);

        return (
          <TrackerPlayerChip
            key={chip.key}
            label={chip.label}
            playerRef={chip.playerRef}
            discHolderRef={discHolderRef}
            oppHasDisc={oppHasDisc}
            passModifier={passModifier}
            onTap={handlers.onPlayerTap}
            onDrop={handlers.onDrop}
            onGoal={handlers.onGoal}
            onThrowaway={handlers.onThrowaway}
            chipWidth={chipWidth}
          />
        );
      })}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'center',
      gap: isLandscape ? scaleBySizeClass(10, sizeClass) : scaleBySizeClass(12, sizeClass),
      padding: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
    },
  });
}
