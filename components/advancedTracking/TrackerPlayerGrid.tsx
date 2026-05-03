import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TrackerPlayerChip } from './TrackerPlayerChip';
import { PassModifier } from './types';

interface TrackerPlayerGridProps {
  activeParticipants: Participant[];
  discHolderId: string | null;
  oppHasDisc: boolean;
  passModifier: PassModifier;
  onPlayerTap: (participantId: string) => void;
  onDrop: (participantId: string) => void;
  onGoal: (participantId: string) => void;
  onThrowaway: () => void;
  availableWidth?: number;
}

export const TrackerPlayerGrid = ({
  activeParticipants,
  discHolderId,
  oppHasDisc,
  passModifier,
  onPlayerTap,
  onDrop,
  onGoal,
  onThrowaway,
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

  const rows: Participant[][] = [];
  for (let i = 0; i < activeParticipants.length; i += columns) {
    rows.push(activeParticipants.slice(i, i + columns));
  }

  return (
    <View style={styles.gridContainer}>
      {rows.map((row, i) =>
        row.length > 0 ? (
          <View key={i} style={styles.row}>
            {row.map((p) => (
              <TrackerPlayerChip
                key={p.id}
                p={p}
                discHolderId={discHolderId}
                oppHasDisc={oppHasDisc}
                passModifier={passModifier}
                onTap={onPlayerTap}
                onDrop={onDrop}
                onGoal={onGoal}
                onThrowaway={onThrowaway}
                chipWidth={chipWidth}
              />
            ))}
          </View>
        ) : null,
      )}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    gridContainer: {
      justifyContent: 'center',
      gap: isLandscape ? scaleBySizeClass(10, sizeClass) : scaleBySizeClass(12, sizeClass),
      padding: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: scaleBySizeClass(10, sizeClass),
    },
  });
}
