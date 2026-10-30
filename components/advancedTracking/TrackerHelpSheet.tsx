import MaterialCommunityIcons, {
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons/static';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import type { TutorialAdvancedVariant } from '@/components/tutorial/tutorialNavigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TrackerHelpSheetProps {
  visible: boolean;
  onClose: () => void;
  showReturnToTracking?: boolean;
  onAdvancedTutorial?: (variant: TutorialAdvancedVariant) => void;
}

interface HelpRow {
  event: string;
  instruction: string;
  icon: MaterialDesignIconsIconName;
}

const helpRows: HelpRow[] = [
  {
    event: 'We scored',
    instruction: 'Swipe up on who scored, or tap Goal then who scored.',
    icon: 'arrow-up',
  },
  {
    event: 'We threw it away',
    instruction: 'Swipe down on the thrower, or tap T/A.',
    icon: 'arrow-down',
  },
  {
    event: 'We dropped it',
    instruction: 'Swipe down on who dropped it, or tap Drop then who dropped it.',
    icon: 'arrow-down',
  },
  {
    event: 'We got a block',
    instruction: 'Tap the player who got the block.',
    icon: 'gesture-tap',
  },
  {
    event: 'Something else happened',
    instruction: 'Tap More (•••) to record actions like stall, callahan, etc.',
    icon: 'dots-horizontal',
  },
];

interface TutorialRow {
  variant: TutorialAdvancedVariant;
  label: string;
  icon: MaterialDesignIconsIconName;
}

const tutorialRows: TutorialRow[] = [
  { variant: 'buttons', label: 'Tutorial: Buttons', icon: 'gesture-tap' },
  { variant: 'gestures', label: 'Tutorial: Gestures', icon: 'gesture-swipe-vertical' },
];

export function TrackerHelpSheet({
  visible,
  onClose,
  showReturnToTracking = true,
  onAdvancedTutorial,
}: TrackerHelpSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleAdvancedTutorial = (variant: TutorialAdvancedVariant) => {
    onClose();
    onAdvancedTutorial?.(variant);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        testID="tracker-help-sheet"
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
        <View style={styles.header}>
          <ThemedText
            accessibilityRole="header"
            style={[styles.title, { color: palette.modalText }]}>
            What happened?
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close help"
            testID="tracker-help-close"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.modalText}
            />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            {helpRows.map((row) => (
              <View key={row.event} style={styles.row}>
                <MaterialCommunityIcons
                  name={row.icon}
                  size={scaleBySizeClass(26, sizeClass)}
                  color={palette.modalText}
                  style={styles.rowIcon}
                />
                <View style={styles.rowText}>
                  <ThemedText style={[styles.event, { color: palette.modalText }]}>
                    {row.event}
                  </ThemedText>
                  <ThemedText style={[styles.body, { color: palette.modalTextMuted }]}>
                    {row.instruction}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.referenceSection}>
            <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
              RED ZONE
            </ThemedText>
            <View style={styles.row}>
              <View style={[styles.rowIcon, styles.redZoneDotContainer]}>
                <View style={[styles.redZoneDot, { backgroundColor: palette.danger }]} />
              </View>
              <View style={styles.rowText}>
                <ThemedText style={[styles.body, { color: palette.modalTextMuted }]}>
                  Tap RZ when either team is in their endzone set.
                </ThemedText>
              </View>
            </View>
          </View>

          {onAdvancedTutorial && (
            <View style={styles.referenceSection}>
              <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
                PRACTICE
              </ThemedText>
              {tutorialRows.map((row) => (
                <Pressable
                  key={row.variant}
                  accessibilityRole="button"
                  testID={`tracker-help-tutorial-${row.variant}`}
                  onPress={() => handleAdvancedTutorial(row.variant)}
                  style={({ pressed }) => [styles.tutorialRow, pressed && { opacity: 0.7 }]}>
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={scaleBySizeClass(26, sizeClass)}
                    color={palette.modalText}
                  />
                  <ThemedText style={[styles.event, styles.rowText, { color: palette.modalText }]}>
                    {row.label}
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={scaleBySizeClass(22, sizeClass)}
                    color={palette.modalTextMuted}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
        {showReturnToTracking && (
          <Pressable
            accessibilityRole="button"
            testID="tracker-help-return"
            onPress={onClose}
            style={({ pressed }) => [
              styles.returnButton,
              { backgroundColor: palette.accent },
              pressed && { opacity: 0.7 },
            ]}>
            <ThemedText style={[styles.event, { color: palette.textOnAccent }]}>
              Back to tracking
            </ThemedText>
          </Pressable>
        )}
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: { maxHeight: '90%', width: '100%', maxWidth: 640, alignSelf: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 20,
      paddingRight: 10,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: { fontSize: scaleBySizeClass(24, sizeClass), fontFamily: Fonts.bold, flexShrink: 1 },
    closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingBottom: 16, gap: 20 },
    hint: { padding: 14, borderRadius: 12, gap: 4 },
    sectionLabel: { fontSize: scaleBySizeClass(14, sizeClass), fontFamily: Fonts.semiBold },
    section: { gap: 20 },
    referenceSection: { gap: 14 },
    redZoneDotContainer: {
      width: scaleBySizeClass(26, sizeClass),
      height: scaleBySizeClass(22, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    redZoneDot: {
      width: scaleBySizeClass(12, sizeClass),
      height: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(6, sizeClass),
    },
    row: { flexDirection: 'row', gap: 14 },
    tutorialRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
    rowIcon: { marginTop: 2 },
    rowText: { flex: 1, gap: 4 },
    event: { fontSize: scaleBySizeClass(16, sizeClass), fontFamily: Fonts.semiBold },
    body: {
      fontSize: scaleBySizeClass(15, sizeClass),
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    returnButton: {
      minHeight: 48,
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
