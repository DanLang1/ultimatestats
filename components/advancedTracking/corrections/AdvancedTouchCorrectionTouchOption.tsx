import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  hasAlternativeParticipant,
  type AdvancedTouchOccurrence,
} from '@/lib/advancedTracking/advancedTouchCorrectionUtils';
import {
  getParticipantDisplayLabel,
  getParticipantNameFromRef,
} from '@/lib/advancedTracking/participantUtils';
import type { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface AdvancedTouchCorrectionTouchOptionProps {
  index: number;
  touch: AdvancedTouchOccurrence;
  participants: Participant[];
  selectedTouchId: string | null;
  selectedParticipant: Participant | undefined;
  isSaving: boolean;
  onPress: () => void;
}

export function AdvancedTouchCorrectionTouchOption({
  index,
  touch,
  participants,
  selectedTouchId,
  selectedParticipant,
  isSaving,
  onPress,
}: AdvancedTouchCorrectionTouchOptionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const isSelected = touch.touchId === selectedTouchId;
  const isEditable = hasAlternativeParticipant(
    touch.currentRef,
    touch.currentParticipantId,
    touch.eligibleParticipants,
  );
  const currentTouchLabel = getTouchLabel(touch, participants);
  const isProposedReplacement =
    isSelected &&
    selectedParticipant != null &&
    selectedParticipant.id !== touch.currentParticipantId;
  const displayedTouchLabel = isProposedReplacement
    ? getParticipantDisplayLabel(selectedParticipant)
    : currentTouchLabel;
  const accessibilityLabel = getTouchAccessibilityLabel({
    index,
    currentTouchLabel,
    displayedTouchLabel,
    isProposedReplacement,
    isSelected,
  });

  return (
    <View style={styles.sequenceItem}>
      {index > 0 && (
        <MaterialCommunityIcons
          name="arrow-right"
          size={scaleBySizeClass(15, sizeClass)}
          color={palette.modalTextMuted}
        />
      )}
      <Pressable
        testID={`advanced-touch-${touch.touchId}`}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isSelected, disabled: !isEditable }}
        disabled={!isEditable || isSaving}
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: isSelected ? palette.accentOverlay15 : palette.overlay10,
            borderColor: isSelected ? palette.accent : palette.overlay15,
          },
          !isEditable && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <View style={styles.chipContent}>
          <ThemedText
            style={[styles.text, { color: isSelected ? palette.accent : palette.modalText }]}>
            {displayedTouchLabel}
          </ThemedText>
          {isProposedReplacement && (
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.accent}
              accessible={false}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}

function getTouchLabel(touch: AdvancedTouchOccurrence, participants: Participant[]): string {
  const participant = participants.find((candidate) => candidate.id === touch.currentParticipantId);
  return participant == null
    ? getParticipantNameFromRef(touch.currentRef, participants)
    : getParticipantDisplayLabel(participant);
}

function getTouchAccessibilityLabel({
  index,
  currentTouchLabel,
  displayedTouchLabel,
  isProposedReplacement,
  isSelected,
}: {
  index: number;
  currentTouchLabel: string;
  displayedTouchLabel: string;
  isProposedReplacement: boolean;
  isSelected: boolean;
}): string {
  if (isProposedReplacement) {
    return `Touch ${index + 1}, currently ${currentTouchLabel}, will change to ${displayedTouchLabel}`;
  }
  if (isSelected) {
    return `Touch ${index + 1}, ${currentTouchLabel}, unchanged`;
  }
  return `Select touch ${index + 1}, ${currentTouchLabel}`;
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sequenceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    text: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pressed: {
      opacity: 0.8,
    },
    disabled: {
      opacity: 0.45,
    },
  });
}
