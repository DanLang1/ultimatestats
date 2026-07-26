import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface NewGameSheetProps {
  visible: boolean;
  activeGameKind: 'advanced' | 'basic' | 'none';
  onClose: () => void;
  onStartBasic: () => void;
  onStartAdvanced: () => void;
  onStartScrimmage: () => void;
}

export function NewGameSheet({
  visible,
  activeGameKind,
  onClose,
  onStartBasic,
  onStartAdvanced,
  onStartScrimmage,
}: NewGameSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const hasActiveGame = activeGameKind !== 'none';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        sheetStyle={[styles.sheet, { backgroundColor: palette.primary }]}
        minBottomPadding={12}>
        <View accessible={false} style={styles.content}>
          <View
            accessible={false}
            style={[styles.handle, { backgroundColor: palette.overlay20 }]}
          />

          <View
            accessible={false}
            style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <View>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                New Game
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          {hasActiveGame && (
            <View
              style={[
                styles.warning,
                {
                  backgroundColor: palette.dangerOverlay10,
                  borderColor: palette.dangerOverlay15,
                },
              ]}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.danger}
              />
              <ThemedText style={[styles.warningText, { color: palette.danger }]}>
                This will clear the current in-progress game
              </ThemedText>
            </View>
          )}

          <BottomSheetActionRow
            testID="new-game-sheet-basic"
            icon="scoreboard-outline"
            label="Basic Scoreboard"
            trailingIcon="chevron-right"
            onPress={onStartBasic}
          />

          <BottomSheetActionRow
            testID="new-game-sheet-advanced"
            icon="clipboard-pulse-outline"
            label="Advanced Tracker"
            tone="success"
            trailingIcon="chevron-right"
            onPress={onStartAdvanced}
          />

          <BottomSheetActionRow
            testID="new-game-sheet-scrimmage"
            icon="account-group-outline"
            label="Scrimmage"
            trailingIcon="chevron-right"
            onPress={onStartScrimmage}
          />
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '75%',
    },
    content: {
      paddingHorizontal: 16,
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
      justifyContent: 'space-between',
      gap: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
    },
    warning: {
      minHeight: scaleBySizeClass(54, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    warningText: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
