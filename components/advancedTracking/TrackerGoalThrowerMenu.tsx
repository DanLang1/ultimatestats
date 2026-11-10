import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TrackerGoalThrowerMenuProps {
  scorerName: string;
  /** Who threw the pass the scorer was logged as catching. */
  passThrowerName: string;
  onClose: () => void;
  onPassWasGoal: () => void;
  onSelfGoal: () => void;
}

/**
 * Asks who threw a goal by the player holding the disc: the pass they were logged as catching, or
 * their own throw.
 */
export function TrackerGoalThrowerMenu({
  scorerName,
  passThrowerName,
  onClose,
  onPassWasGoal,
  onSelfGoal,
}: TrackerGoalThrowerMenuProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <BottomSheet
        testID="goal-thrower-menu"
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
            <ThemedText style={[styles.title, { color: palette.textMuted }]}>
              WHO THREW IT?
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          <BottomSheetActionRow
            testID="goal-thrower-pass"
            icon="account-arrow-right"
            label={`${passThrowerName} → ${scorerName}`}
            tone="success"
            onPress={onPassWasGoal}
          />

          <BottomSheetActionRow
            testID="goal-thrower-self"
            icon="account"
            label={`${scorerName} → Self goal (MACed disc)`}
            onPress={onSelfGoal}
          />
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
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
  });
}
