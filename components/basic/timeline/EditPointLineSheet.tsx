import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPlayerGrid } from '@/components/lines/ModalPlayerGrid';
import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MODAL_MAX_WIDTH_LARGE } from '@/lib/constants';
import { Player, PointLineRecord } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

interface EditPointLineSheetProps {
  pointNumber: number;
  roster: Player[];
  pointLines: PointLineRecord[];
  initialLine: string[];
  hasSubstitutionHistory: boolean;
  onDismiss: () => void;
  onSave: (playerIds: string[]) => Promise<boolean>;
}

function haveSamePlayers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((playerId) => rightSet.has(playerId));
}

export default function EditPointLineSheet({
  pointNumber,
  roster,
  pointLines,
  initialLine,
  hasSubstitutionHistory,
  onDismiss,
  onSave,
}: EditPointLineSheetProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const linePlayerSortOrder = useSettingsStore((state) => state.linePlayerSortOrder);
  const [selectedIds, setSelectedIds] = useState(initialLine);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const requiredPlayerCount = initialLine.length;
  const hasChanges = !haveSamePlayers(initialLine, selectedIds);
  const canSave = selectedIds.length === requiredPlayerCount && hasChanges && !isSaving;

  const handleTogglePlayer = (playerId: string) => {
    setSaveError(false);
    setSelectedIds((currentSelection) => {
      if (currentSelection.includes(playerId)) {
        return currentSelection.filter((id) => id !== playerId);
      }
      if (currentSelection.length >= requiredPlayerCount) return currentSelection;
      return [...currentSelection, playerId];
    });
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    if (await onSave(selectedIds)) {
      onDismiss();
      return;
    }

    setIsSaving(false);
    setSaveError(true);
  };

  return (
    <BottomSheet
      onDismiss={onDismiss}
      testID="edit-point-line-modal"
      sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
      <View style={[styles.header, { borderBottomColor: palette.overlay15 }]}>
        <View style={styles.headerCopy}>
          <ThemedText style={[styles.headerTitle, { color: palette.modalText }]}>
            Edit Point {pointNumber} Line
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.modalTextMuted }]}>
            Select exactly {requiredPlayerCount} players
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close line editor"
          hitSlop={12}
          onPress={onDismiss}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons
            name="close"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.modalTextMuted}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.selectionHeader}>
          <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
            PLAYERS ON FIELD
          </ThemedText>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor:
                  selectedIds.length === requiredPlayerCount
                    ? palette.successOverlay15
                    : palette.warningOverlay15,
              },
            ]}>
            <ThemedText
              style={[
                styles.countText,
                {
                  color:
                    selectedIds.length === requiredPlayerCount ? palette.success : palette.warning,
                },
              ]}>
              {selectedIds.length} / {requiredPlayerCount} selected
            </ThemedText>
          </View>
        </View>

        {hasSubstitutionHistory && (
          <View
            style={[
              styles.warning,
              {
                backgroundColor: palette.warningOverlay10,
                borderColor: palette.warning,
              },
            ]}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.warning}
            />
            <ThemedText style={[styles.warningText, { color: palette.modalText }]}>
              Saving replaces this point&apos;s substitution history with one corrected line.
            </ThemedText>
          </View>
        )}

        <View style={styles.playerGrid}>
          <ModalPlayerGrid
            roster={roster}
            pointLines={pointLines}
            selectedIds={selectedIds}
            onTogglePlayer={handleTogglePlayer}
            sortDirection={linePlayerSortOrder}
            useModalColors
          />
        </View>

        {saveError && (
          <ThemedText style={[styles.errorText, { color: palette.danger }]}>
            The lineup could not be saved. Reopen the timeline and try again.
          </ThemedText>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.secondaryButtonText, { color: palette.modalTextMuted }]}>
              Cancel
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.accent },
              !canSave && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="check"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textOnAccent}
            />
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {isSaving ? 'Saving…' : 'Save Line'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      width: '100%',
      height: isLandscape ? '96%' : '84%',
      maxWidth: getSizeClassValue(MODAL_MAX_WIDTH_LARGE, sizeClass),
      alignSelf: 'center',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerCopy: {
      flex: 1,
      gap: 3,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    headerSubtitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    closeButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    selectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.7,
    },
    countBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    countText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    warningText: {
      flex: 1,
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(17, sizeClass),
    },
    playerGrid: {
      flex: 1,
      minHeight: isLandscape ? 110 : 180,
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingBottom: 4,
    },
    secondaryButton: {
      minHeight: 48,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 12,
    },
    secondaryButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    primaryButton: {
      minHeight: 48,
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 12,
    },
    primaryButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    pressed: {
      opacity: 0.75,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
