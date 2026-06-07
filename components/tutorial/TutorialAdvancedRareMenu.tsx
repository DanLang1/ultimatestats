import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import { Modal, StyleSheet, View } from 'react-native';

interface TutorialAdvancedRareMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectStall: () => void;
}

export default function TutorialAdvancedRareMenu({
  visible,
  onClose,
  onSelectStall,
}: TutorialAdvancedRareMenuProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        sheetStyle={{ backgroundColor: palette.primary, borderColor: palette.overlay20 }}>
        <View style={styles.content}>
          <ThemedText
            style={[
              styles.title,
              { color: palette.textMuted, fontSize: scaleBySizeClass(12, sizeClass) },
            ]}>
            RARE ACTIONS
          </ThemedText>
          <BottomSheetActionRow
            testID="tutorial-rare-menu-stall"
            icon="timer-alert-outline"
            label="Stall"
            tone="success"
            onPress={onSelectStall}
          />
        </View>
      </BottomSheet>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  title: { fontFamily: Fonts.bold, letterSpacing: 1.5 },
});
