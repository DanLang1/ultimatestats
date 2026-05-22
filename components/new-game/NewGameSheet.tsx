import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface NewGameSheetProps {
  visible: boolean;
  activeGameKind: 'advanced' | 'basic' | 'none';
  onClose: () => void;
  onStartBasic: () => void;
  onStartAdvanced: () => void;
}

export function NewGameSheet({
  visible,
  activeGameKind,
  onClose,
  onStartBasic,
  onStartAdvanced,
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

          <Pressable
            onPress={onStartBasic}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay15 },
              pressed && styles.optionPressed,
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.accentOverlay10 }]}>
              <MaterialCommunityIcons
                name="scoreboard-outline"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.accent}
              />
            </View>
            <View style={styles.optionCopy}>
              <ThemedText style={[styles.optionTitle, { color: palette.textInverse }]}>
                Basic Scoreboard
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <Pressable
            testID="new-game-sheet-advanced"
            onPress={onStartAdvanced}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: palette.successOverlay10, borderColor: palette.overlay15 },
              pressed && styles.optionPressed,
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.successOverlay15 }]}>
              <MaterialCommunityIcons
                name="clipboard-pulse-outline"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.success}
              />
            </View>
            <View style={styles.optionCopy}>
              <ThemedText style={[styles.optionTitle, { color: palette.textInverse }]}>
                Advanced Tracker
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
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
    subtitle: {
      marginTop: 4,
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.regular,
    },
    option: {
      minHeight: scaleBySizeClass(86, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    optionPressed: {
      opacity: 0.75,
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
    iconWrap: {
      width: scaleBySizeClass(42, sizeClass),
      height: scaleBySizeClass(42, sizeClass),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionCopy: {
      flex: 1,
      gap: 4,
    },
    optionTitle: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    optionDescription: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.regular,
    },
  });
}
