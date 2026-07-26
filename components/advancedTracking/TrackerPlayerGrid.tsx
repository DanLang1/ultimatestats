import React from 'react';
import { StyleSheet, View } from 'react-native';

import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getTrackerChipWidth } from '@/lib/advancedTracking/trackerLayoutUtils';
import { Participant, PlayerRef } from '@/lib/advancedTracking/types';

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
  availableHeight: number | null;
}

const PORTRAIT_MAX_CHIP_WIDTH = { small: 180, medium: 170, large: 190 } as const;
const LANDSCAPE_MAX_CHIP_WIDTH = { small: 180, medium: 220, large: 260 } as const;
const PORTRAIT_COLUMNS = 3;
const LANDSCAPE_COLUMNS = 5;
const GRID_VERTICAL_PADDING = 12;

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
  availableHeight,
}: TrackerPlayerGridProps) => {
  const { width, sizeClass, isLandscape } = useLayout();

  const columns = isLandscape ? LANDSCAPE_COLUMNS : PORTRAIT_COLUMNS;
  const horizontalPadding = scaleBySizeClass(20, sizeClass);
  const gap = scaleBySizeClass(isLandscape ? 10 : 12, sizeClass);

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

  const rowCount = items.length / columns;
  const verticalPadding = scaleBySizeClass(GRID_VERTICAL_PADDING, sizeClass);
  const maxChipWidths = isLandscape ? LANDSCAPE_MAX_CHIP_WIDTH : PORTRAIT_MAX_CHIP_WIDTH;
  const chipWidth = getTrackerChipWidth({
    screenWidth: width,
    horizontalPadding,
    gap,
    columns,
    maxChipWidth: getSizeClassValue(maxChipWidths, sizeClass),
    availableHeight,
    rowCount,
    verticalPadding,
    sideLabelHeight: 0,
  });
  const gridWidth = chipWidth * columns + gap * (columns - 1) + horizontalPadding * 2;

  const styles = createStyles(sizeClass, gap, verticalPadding);

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

function createStyles(sizeClass: SizeClass, gap: number, verticalPadding: number) {
  return StyleSheet.create({
    gridContainer: {
      alignSelf: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'center',
      gap,
      paddingVertical: verticalPadding,
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
    },
  });
}
