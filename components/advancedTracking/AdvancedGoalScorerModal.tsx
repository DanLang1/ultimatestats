import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedGoalScorerCorrectionContext } from '@/lib/advancedTracking/advancedActionCorrectionUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedGoalScorerModalProps {
  context: AdvancedGoalScorerCorrectionContext;
  onClose: () => void;
  onSave: (participantId: string) => void | Promise<void>;
}

export function AdvancedGoalScorerModal({
  context,
  onClose,
  onSave,
}: AdvancedGoalScorerModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    context.currentScorerParticipantId,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const sortedParticipants = [...context.eligibleParticipants].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const canSave =
    selectedParticipantId != null &&
    selectedParticipantId !== context.currentScorerParticipantId &&
    !isSaving;

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSelect = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setSaveError(false);
  };

  const handleSave = async () => {
    if (!canSave || selectedParticipantId == null) return;

    setIsSaving(true);
    setSaveError(false);
    try {
      await onSave(selectedParticipantId);
      onClose();
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  const actionLabel = context.action.result === 'callahan' ? 'Callahan' : 'goal';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={handleClose}>
      <BottomSheet
        testID="advanced-goal-scorer-editor"
        onDismiss={handleClose}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        overlayColor={palette.overlayDark88}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText style={[styles.title, { color: palette.modalText }]}>
                Edit Scorer
              </ThemedText>
              <ThemedText style={[styles.description, { color: palette.modalTextMuted }]}>
                Choose who scored the {actionLabel} for {context.scoringSideLabel}.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close scorer editor"
              onPress={handleClose}
              hitSlop={12}
              disabled={isSaving}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.modalTextMuted}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.playerScroll}
            contentContainerStyle={styles.playerGrid}
            showsVerticalScrollIndicator={false}>
            {sortedParticipants.map((participant) => (
              <View key={participant.id} style={styles.playerChipWrapper}>
                <PlayerChip
                  name={participant.name}
                  number={participant.number}
                  matchingType={participant.matchingType}
                  role={participant.role}
                  selected={selectedParticipantId === participant.id}
                  disabled={isSaving}
                  useModalColors
                  onPress={() => handleSelect(participant.id)}
                />
              </View>
            ))}
          </ScrollView>

          {saveError && (
            <ThemedText style={[styles.errorText, { color: palette.danger }]}>
              Could not save the corrected scorer. Try again.
            </ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable
              testID="advanced-goal-scorer-cancel"
              accessibilityRole="button"
              onPress={handleClose}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              testID="advanced-goal-scorer-save"
              accessibilityRole="button"
              accessibilityLabel="Save corrected scorer"
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.button,
                styles.saveButton,
                { backgroundColor: palette.accent },
                pressed && styles.buttonPressed,
                !canSave && styles.buttonDisabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator size="small" color={palette.textOnAccent} />
              ) : (
                <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
                  Update
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '88%',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 14,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    headerText: {
      flex: 1,
      gap: 5,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
    },
    description: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(17, sizeClass),
    },
    playerScroll: {
      maxHeight: scaleBySizeClass(320, sizeClass),
    },
    playerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingVertical: 2,
    },
    playerChipWrapper: {
      minWidth: '46%',
      flexGrow: 1,
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    button: {
      minHeight: 46,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      minWidth: scaleBySizeClass(132, sizeClass),
      borderWidth: 0,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
