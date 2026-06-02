import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant, PlayerRef } from '@/lib/advancedTracking/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TrackerLineActionTile } from './TrackerLineActionTile';
import { TrackerPlayerChip } from './TrackerPlayerChip';
import { PassModifier } from './types';

export interface TrackerPlayerGridHandlers {
  onPlayerTap: (ref: PlayerRef) => void;
  onDrop: (ref: PlayerRef) => void;
  onPullDrop: (ref: PlayerRef) => void;
  onGoal: (ref: PlayerRef) => void;
  onThrowaway: () => void;
}

interface TrackerPlayerGridProps {
  activeParticipants: Participant[];
  discHolderRef: PlayerRef | null;
  oppHasDisc: boolean;
  canDropOpeningPull: boolean;
  passModifier: PassModifier;
  handlers: TrackerPlayerGridHandlers;
  onLineChangePress: () => void;
  canChangeLine: boolean;
  availableWidth?: number;
}

const MAX_CHIP_WIDTH = { small: 180, medium: 220, large: 260 } as const;

function getChipModel(item: Participant | 'unknown'): {
  label: string;
  playerNumber?: string;
  playerRef: PlayerRef;
  key: string;
} {
  if (item === 'unknown') {
    return { label: 'Unknown', playerRef: { refType: 'unknown' }, key: 'unknown' };
  }
  return {
    label: item.name,
    playerNumber: item.number,
    playerRef: { refType: 'participant', participantId: item.id },
    key: item.id,
  };
}

export const TrackerPlayerGrid = ({
  activeParticipants,
  discHolderRef,
  oppHasDisc,
  canDropOpeningPull,
  passModifier,
  handlers,
  onLineChangePress,
  canChangeLine,
  availableWidth,
}: TrackerPlayerGridProps) => {
  const { width, sizeClass, isLandscape } = useLayout();

  const columns = 3;
  const horizontalPadding = scaleBySizeClass(20, sizeClass);
  const hPadding = horizontalPadding * 2;
  const gap = scaleBySizeClass(12, sizeClass);
  const availableChipWidth = Math.floor(
    ((availableWidth ?? width) - hPadding - gap * (columns - 1)) / columns,
  );
  const chipWidth = Math.min(availableChipWidth, getSizeClassValue(MAX_CHIP_WIDTH, sizeClass));
  const gridWidth = chipWidth * columns + gap * (columns - 1) + hPadding;

  const styles = createStyles(sizeClass, isLandscape);

  const items: (Participant | 'unknown' | 'line-action' | null)[] = [
    ...activeParticipants,
    'unknown',
  ];
  if (canChangeLine) {
    items.push('line-action');
  }
  while (items.length % columns !== 0) {
    items.push(null);
  }

  return (
    <View style={[styles.gridContainer, { width: gridWidth }]}>
      {items.map((item, i) => {
        if (item === null) {
          return <View key={`placeholder-${i}`} style={{ width: chipWidth, aspectRatio: 1 }} />;
        }

        if (item === 'line-action') {
          return (
            <TrackerLineActionTile
              key="line-action"
              chipWidth={chipWidth}
              onPress={onLineChangePress}
            />
          );
        }

        const chip = getChipModel(item);

        return (
          <TrackerPlayerChip
            key={chip.key}
            label={chip.label}
            playerNumber={chip.playerNumber}
            playerRef={chip.playerRef}
            discHolderRef={discHolderRef}
            oppHasDisc={oppHasDisc}
            canDropOpeningPull={canDropOpeningPull}
            passModifier={passModifier}
            onTap={handlers.onPlayerTap}
            onDrop={handlers.onDrop}
            onPullDrop={handlers.onPullDrop}
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
      alignSelf: 'center',
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
