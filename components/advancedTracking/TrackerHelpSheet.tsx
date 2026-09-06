import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TrackerHelpSheetProps {
  visible: boolean;
  onClose: () => void;
  onTutorial: () => void;
}

interface HelpRow {
  event: string;
  instruction: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const helpRows: HelpRow[] = [
  {
    event: 'We scored',
    instruction: 'Swipe up on who scored.',
    icon: 'arrow-up',
  },
  {
    event: 'We threw it away',
    instruction: 'Swipe down on the thrower.',
    icon: 'arrow-down',
  },
  {
    event: 'We dropped it',
    instruction: 'Swipe down on who dropped it.',
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

export function TrackerHelpSheet({ visible, onClose, onTutorial }: TrackerHelpSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

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
          <Pressable
            accessibilityRole="button"
            testID="tracker-help-tutorial"
            onPress={onTutorial}
            style={({ pressed }) => [
              styles.tutorialButton,
              { borderColor: palette.overlay20 },
              pressed && { opacity: 0.7 },
            ]}>
            <MaterialCommunityIcons
              name="gesture-swipe-vertical"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.modalText}
            />
            <ThemedText style={[styles.event, { color: palette.modalText }]}>
              Practice in the tutorial
            </ThemedText>
          </Pressable>
        </ScrollView>
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
    row: { flexDirection: 'row', gap: 14 },
    rowIcon: { marginTop: 2 },
    rowText: { flex: 1, gap: 4 },
    event: { fontSize: scaleBySizeClass(16, sizeClass), fontFamily: Fonts.semiBold },
    body: {
      fontSize: scaleBySizeClass(15, sizeClass),
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    tutorialButton: {
      minHeight: 48,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
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
