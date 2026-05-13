import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface TrackerLineChangeMenuProps {
  visible: boolean;
  onClose: () => void;
  onCorrectLine: () => void;
  onInjurySub: () => void;
}

export function TrackerLineChangeMenu({
  visible,
  onClose,
  onCorrectLine,
  onInjurySub,
}: TrackerLineChangeMenuProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const closeAnd = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
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
            <View style={styles.headerText}>
              <ThemedText style={[styles.eyebrow, { color: palette.textMuted }]}>
                LINE CHANGE
              </ThemedText>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                What changed?
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

          <Pressable
            testID="line-change-correct-line"
            onPress={closeAnd(onCorrectLine)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: palette.overlay05,
                borderColor: palette.overlay15,
              },
              pressed && { opacity: 0.7 },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.accentOverlay10 }]}>
              <MaterialCommunityIcons
                name="playlist-edit"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.accent}
              />
            </View>
            <View style={styles.actionText}>
              <ThemedText style={[styles.actionLabel, { color: palette.textInverse }]}>
                Correct lineup
              </ThemedText>
              <ThemedText style={[styles.actionDescription, { color: palette.textMuted }]}>
                Fix who started this point. Replaces point credit.
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            testID="line-change-injury-sub"
            onPress={closeAnd(onInjurySub)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: palette.overlay05,
                borderColor: palette.overlay15,
              },
              pressed && { opacity: 0.7 },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: palette.warningOverlay10 }]}>
              <MaterialCommunityIcons
                name="medical-bag"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.warning}
              />
            </View>
            <View style={styles.actionText}>
              <ThemedText style={[styles.actionLabel, { color: palette.textInverse }]}>
                Injury substitution
              </ThemedText>
              <ThemedText style={[styles.actionDescription, { color: palette.textMuted }]}>
                Player changed during the point. Both players get point credit.
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '58%',
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 3,
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
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    iconWrap: {
      width: scaleBySizeClass(40, sizeClass),
      height: scaleBySizeClass(40, sizeClass),
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      flex: 1,
      gap: 3,
    },
    actionLabel: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    actionDescription: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
  });
}
