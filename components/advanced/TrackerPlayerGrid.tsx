import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TrackerPlayerChip } from './TrackerPlayerChip';

interface TrackerPlayerGridProps {
  activeParticipants: Participant[];
  discHolderId: string | null;
  oppHasDisc: boolean;
  onPlayerTap: (participantId: string) => void;
}

export const TrackerPlayerGrid = ({
  activeParticipants,
  discHolderId,
  oppHasDisc,
  onPlayerTap,
}: TrackerPlayerGridProps) => {
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.gridContainer}>
      <View style={styles.row}>
        {activeParticipants.slice(0, 4).map((p) => (
          <TrackerPlayerChip
            key={p.id}
            p={p}
            discHolderId={discHolderId}
            oppHasDisc={oppHasDisc}
            onTap={onPlayerTap}
          />
        ))}
      </View>
      <View style={styles.row}>
        {activeParticipants.slice(4, 7).map((p) => (
          <TrackerPlayerChip
            key={p.id}
            p={p}
            discHolderId={discHolderId}
            oppHasDisc={oppHasDisc}
            onTap={onPlayerTap}
          />
        ))}
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    gridContainer: {
      flex: 1,
      justifyContent: 'center',
      gap: scaleBySizeClass(24, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: scaleBySizeClass(12, sizeClass),
    },
  });
}
