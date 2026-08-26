import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface AdvancedTouchCorrectionParticipantPickerProps {
  originalName: string;
  participants: Participant[];
  originalParticipantId: string | null;
  selectedParticipantId: string | null;
  isSaving: boolean;
  onSelectParticipant: (participantId: string) => void;
}

export function AdvancedTouchCorrectionParticipantPicker({
  originalName,
  participants,
  originalParticipantId,
  selectedParticipantId,
  isSaving,
  onSelectParticipant,
}: AdvancedTouchCorrectionParticipantPickerProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.originalLabel, { color: palette.accent }]}>
        ORIGINAL: {originalName}
      </ThemedText>
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
              onPress={() => onSelectParticipant(participant.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    section: {
      gap: 10,
    },
    originalLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    playerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    playerChipWrapper: {
      minWidth: '46%',
      flexGrow: 1,
    },
  });
}
