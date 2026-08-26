import { StyleSheet, View } from 'react-native';

import { PlayerChip } from '@/components/ui/PlayerChip';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { Participant } from '@/lib/advancedTracking/types';

interface AdvancedTurnoverRolePickerProps {
  originalParticipantId: string | null;
  selectedParticipantId: string | null;
  participants: Participant[];
  isSaving: boolean;
  onSelect: (participantId: string) => void;
}

export function AdvancedTurnoverRolePicker({
  originalParticipantId,
  selectedParticipantId,
  participants,
  isSaving,
  onSelect,
}: AdvancedTurnoverRolePickerProps) {
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.playerGrid}>
      {participants.map((participant) => (
        <View key={participant.id} style={styles.playerChipWrapper}>
          <PlayerChip
            name={participant.name}
            number={participant.number}
            matchingType={participant.matchingType}
            role={participant.role}
            subtitle={participant.id === originalParticipantId ? 'ORIGINAL' : undefined}
            selected={selectedParticipantId === participant.id}
            disabled={isSaving}
            useModalColors
            onPress={() => onSelect(participant.id)}
          />
        </View>
      ))}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    playerChipWrapper: {
      minWidth: scaleBySizeClass(132, sizeClass),
      flexGrow: 1,
      flexBasis: '46%',
    },
  });
}
