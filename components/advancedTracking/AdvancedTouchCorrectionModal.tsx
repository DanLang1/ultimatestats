import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdvancedTouchCorrectionParticipantPicker } from '@/components/advancedTracking/corrections/AdvancedTouchCorrectionParticipantPicker';
import { AdvancedTouchCorrectionTouchSequence } from '@/components/advancedTracking/corrections/AdvancedTouchCorrectionTouchSequence';
import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  hasAlternativeParticipant,
  type AdvancedStandaloneCorrectionContext,
  type AdvancedTouchCorrectionLocator,
  type AdvancedTouchCorrectionSegment,
  type AdvancedTouchOccurrence,
} from '@/lib/advancedTracking/advancedTouchCorrectionUtils';
import { getParticipantNameFromRef } from '@/lib/advancedTracking/participantUtils';
import type { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

type AdvancedTouchEditorContext =
  | AdvancedTouchCorrectionSegment
  | AdvancedStandaloneCorrectionContext;

interface AdvancedTouchCorrectionModalProps {
  context: AdvancedTouchEditorContext;
  initialTouchId?: string;
  onClose: () => void;
  onSave: (locator: AdvancedTouchCorrectionLocator, participantId: string) => void | Promise<void>;
}

function getTouchParticipants(segment: AdvancedTouchCorrectionSegment): Participant[] {
  const participants = new Map<string, Participant>();
  for (const touch of segment.touches) {
    for (const participant of touch.eligibleParticipants) {
      participants.set(participant.id, participant);
    }
  }
  return [...participants.values()];
}

export function AdvancedTouchCorrectionModal({
  context,
  initialTouchId,
  onClose,
  onSave,
}: AdvancedTouchCorrectionModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const isSegment = context.kind === 'touch-segment';
  const initialTouch = isSegment
    ? context.touches.find((touch) => touch.touchId === initialTouchId)
    : undefined;
  const [selectedTouchId, setSelectedTouchId] = useState(initialTouch?.touchId ?? null);
  const selectedTouch = isSegment
    ? context.touches.find((touch) => touch.touchId === selectedTouchId)
    : undefined;
  const currentParticipantId = isSegment
    ? (selectedTouch?.currentParticipantId ?? null)
    : context.currentParticipantId;
  const eligibleParticipants = isSegment
    ? (selectedTouch?.eligibleParticipants ?? [])
    : context.eligibleParticipants;
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    isSegment ? (initialTouch?.currentParticipantId ?? null) : context.currentParticipantId,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const sortedParticipants = [...eligibleParticipants].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const canSave =
    selectedParticipantId != null && selectedParticipantId !== currentParticipantId && !isSaving;
  const allTouchParticipants = isSegment
    ? getTouchParticipants(context)
    : context.eligibleParticipants;
  const selectedParticipant = sortedParticipants.find(
    (participant) => participant.id === selectedParticipantId,
  );

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleTouchSelect = (touch: AdvancedTouchOccurrence) => {
    if (
      !hasAlternativeParticipant(
        touch.currentRef,
        touch.currentParticipantId,
        touch.eligibleParticipants,
      )
    ) {
      return;
    }
    setSelectedTouchId(touch.touchId);
    setSelectedParticipantId(touch.currentParticipantId);
    setSaveError(false);
  };

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setSaveError(false);
  };

  const handleSave = async () => {
    if (!canSave || selectedParticipantId == null) return;

    const locator: AdvancedTouchCorrectionLocator = isSegment
      ? {
          pointId: context.point.id,
          possessionId: context.possession.id,
          touchId: selectedTouchId!,
        }
      : {
          pointId: context.point.id,
          possessionId: context.possession.id,
          actionId: context.action.id,
          kind: context.kind,
        };

    setIsSaving(true);
    setSaveError(false);
    try {
      await onSave(locator, selectedParticipantId);
      onClose();
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  let currentName: string | null;
  if (isSegment) {
    currentName =
      selectedTouch == null
        ? null
        : getParticipantNameFromRef(selectedTouch.currentRef, allTouchParticipants);
  } else {
    currentName = getParticipantNameFromRef(context.currentRef, context.eligibleParticipants);
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={handleClose}>
      <BottomSheet
        testID="advanced-touch-editor"
        onDismiss={handleClose}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        overlayColor={palette.overlayDark88}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />

          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: palette.modalText }]}>Edit Touch</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close touch editor"
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
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {isSegment && (
              <AdvancedTouchCorrectionTouchSequence
                touches={context.touches}
                participants={allTouchParticipants}
                selectedTouchId={selectedTouchId}
                selectedParticipant={selectedParticipant}
                isSaving={isSaving}
                onSelectTouch={handleTouchSelect}
              />
            )}

            {isSegment && selectedTouch == null ? (
              <ThemedText style={[styles.prompt, { color: palette.modalTextMuted }]}>
                Select the touch you want to correct.
              </ThemedText>
            ) : (
              <AdvancedTouchCorrectionParticipantPicker
                originalName={currentName ?? 'Unknown'}
                participants={sortedParticipants}
                originalParticipantId={currentParticipantId}
                selectedParticipantId={selectedParticipantId}
                isSaving={isSaving}
                onSelectParticipant={handleParticipantSelect}
              />
            )}

            {saveError && (
              <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                Could not save the participant correction. Try again.
              </ThemedText>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              testID="advanced-touch-cancel"
              accessibilityRole="button"
              onPress={handleClose}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: 'transparent', borderColor: palette.overlay20 },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              testID="advanced-touch-save"
              accessibilityRole="button"
              accessibilityLabel="Save participant correction"
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.button,
                styles.saveButton,
                { backgroundColor: palette.accent, borderColor: palette.accent },
                pressed && styles.pressed,
                !canSave && styles.disabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator size="small" color={palette.textOnAccent} />
              ) : (
                <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
                  Save
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
      maxHeight: '92%',
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
    title: {
      flex: 1,
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
    },
    scroll: {
      maxHeight: scaleBySizeClass(480, sizeClass),
    },
    scrollContent: {
      gap: 16,
      paddingBottom: 4,
    },
    prompt: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
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
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      minWidth: scaleBySizeClass(132, sizeClass),
    },
    pressed: {
      opacity: 0.8,
    },
    disabled: {
      opacity: 0.45,
    },
    buttonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
