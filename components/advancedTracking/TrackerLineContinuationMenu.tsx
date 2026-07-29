import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export type TrackerLineContinuationKind = 'injury-sub' | 'line-correction';

interface TrackerLineContinuationMenuProps {
  visible: boolean;
  kind: TrackerLineContinuationKind;
  currentSideLabel: string;
  otherSideLabel: string;
  onClose: () => void;
  onFinish: () => void;
  onEditOtherSide: () => void;
}

interface ContinuationMenuCopy {
  eyebrow: string;
  title: string;
  finishTestID: string;
  finishLabel: string;
  finishDescription: string;
  editOtherTestID: string;
  editOtherLabel: string;
  editOtherDescription: string;
}

function getContinuationMenuCopy(
  kind: TrackerLineContinuationKind,
  currentSideLabel: string,
  otherSideLabel: string,
): ContinuationMenuCopy {
  if (kind === 'line-correction') {
    return {
      eyebrow: 'LINE CORRECTION',
      title: `${currentSideLabel} lineup updated`,
      finishTestID: 'line-correction-finish',
      finishLabel: 'Finish correction',
      finishDescription: `Save the ${currentSideLabel} lineup correction and return to the tracker.`,
      editOtherTestID: 'line-correction-edit-other',
      editOtherLabel: `Edit ${otherSideLabel} line`,
      editOtherDescription: `Correct the ${otherSideLabel} starting lineup before saving.`,
    };
  }

  return {
    eyebrow: 'INJURY SUBSTITUTION',
    title: `${currentSideLabel} lineup updated`,
    finishTestID: 'injury-sub-finish',
    finishLabel: 'Finish substitution',
    finishDescription: `Save the ${currentSideLabel} lineup change and return to the tracker.`,
    editOtherTestID: 'injury-sub-edit-other',
    editOtherLabel: `Edit ${otherSideLabel} line`,
    editOtherDescription: `Add changes for the ${otherSideLabel} lineup before saving.`,
  };
}

export function TrackerLineContinuationMenu({
  visible,
  kind,
  currentSideLabel,
  otherSideLabel,
  onClose,
  onFinish,
  onEditOtherSide,
}: TrackerLineContinuationMenuProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const copy = getContinuationMenuCopy(kind, currentSideLabel, otherSideLabel);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={[
          styles.sheet,
          {
            backgroundColor: palette.primary,
            borderColor: palette.overlay20,
            shadowColor: palette.shadow,
          },
        ]}>
        <View accessible={false} style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
          <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <ThemedText style={[styles.eyebrow, { color: palette.textMuted }]}>
              {copy.eyebrow}
            </ThemedText>
            <ThemedText style={[styles.title, { color: palette.textInverse }]}>
              {copy.title}
            </ThemedText>
          </View>

          <BottomSheetActionRow
            testID={copy.finishTestID}
            icon="check-circle-outline"
            label={copy.finishLabel}
            description={copy.finishDescription}
            tone="success"
            onPress={onFinish}
          />
          <BottomSheetActionRow
            testID={copy.editOtherTestID}
            icon="account-switch-outline"
            label={copy.editOtherLabel}
            description={copy.editOtherDescription}
            trailingIcon="chevron-right"
            onPress={onEditOtherSide}
          />
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      borderTopWidth: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
      marginBottom: 4,
    },
    header: {
      gap: 4,
      paddingHorizontal: 10,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    eyebrow: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    title: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.extraBold,
    },
  });
}
