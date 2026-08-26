import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface AdvancedTurnoverRolePickerProps {
  label: string;
  currentName: string;
  currentParticipantId: string | null;
  selectedParticipantId: string | null;
  participants: Participant[];
  isReadOnly: boolean;
  isSaving: boolean;
  onSelect: (participantId: string) => void;
}

export function AdvancedTurnoverRolePicker({
  label,
  currentName,
  currentParticipantId,
  selectedParticipantId,
  participants,
  isReadOnly,
  isSaving,
  onSelect,
}: AdvancedTurnoverRolePickerProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.section}>
      <View style={styles.fieldHeader}>
        <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.currentLabel, { color: palette.accent }]}>
          CURRENT: {currentName}
        </ThemedText>
      </View>
      {isReadOnly ? (
        <ThemedText style={[styles.readOnly, { color: palette.modalTextMuted }]}>
          Untracked
        </ThemedText>
      ) : (
        <View style={styles.playerGrid}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.playerChipWrapper}>
              <PlayerChip
                name={participant.name}
                number={participant.number}
                matchingType={participant.matchingType}
                role={participant.role}
                subtitle={participant.id === currentParticipantId ? 'CURRENT' : undefined}
                selected={selectedParticipantId === participant.id}
                disabled={isSaving}
                useModalColors
                onPress={() => onSelect(participant.id)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    section: { gap: 10 },
    fieldHeader: { gap: 4 },
    sectionLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    currentLabel: { fontSize: scaleBySizeClass(11, sizeClass), fontFamily: Fonts.bold },
    readOnly: { fontSize: scaleBySizeClass(13, sizeClass), fontFamily: Fonts.semiBold },
    playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    playerChipWrapper: { minWidth: '46%', flexGrow: 1 },
  });
}
