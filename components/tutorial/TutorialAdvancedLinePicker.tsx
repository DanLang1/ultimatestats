import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import type { TutorialAdvancedLinePreset } from '@/components/tutorial/tutorialAdvancedLineData';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface TutorialAdvancedLinePickerProps {
  visible: boolean;
  preset: TutorialAdvancedLinePreset;
  roster: Player[];
  selected: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export default function TutorialAdvancedLinePicker({
  visible,
  preset,
  roster,
  selected,
  onClose,
  onSelect,
}: TutorialAdvancedLinePickerProps) {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  const names = preset.playerIds
    .map((id) => roster.find((player) => player.id === id)?.name ?? '?')
    .join(', ');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <BottomSheet
        testID="tutorial-line-picker"
        onDismiss={onClose}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        minBottomPadding={16}>
        <View style={styles.content}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: palette.overlay15 }]} />
          </View>
          <ThemedText style={[styles.title, { color: palette.modalText }]}>Load Line</ThemedText>
          <Pressable
            testID={`line-select-preset-${preset.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onSelect}
            style={({ pressed }) => [
              styles.preset,
              {
                backgroundColor: selected ? palette.accentOverlay15 : 'transparent',
                borderColor: palette.overlay15,
              },
              pressed && styles.pressed,
            ]}>
            <View style={styles.presetText}>
              <ThemedText
                style={[
                  styles.presetName,
                  { color: selected ? palette.accent : palette.modalText },
                ]}>
                {preset.name}
              </ThemedText>
              <ThemedText style={[styles.count, { color: palette.modalTextMuted }]}>
                7 players
              </ThemedText>
              <ThemedText
                numberOfLines={2}
                style={[styles.names, { color: palette.modalTextMuted }]}>
                {names}
              </ThemedText>
            </View>
            {selected && (
              <MaterialCommunityIcons
                name="check"
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.accent}
              />
            )}
          </Pressable>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    sheet: {
      maxHeight: isLandscape ? '90%' : '75%',
      width: getSizeClassValue({ small: '100%', medium: '75%', large: '60%' }, sizeClass),
      alignSelf: 'center',
    },
    content: { paddingHorizontal: 16 },
    handleWrap: { alignItems: 'center', paddingVertical: 10 },
    handle: { width: 40, height: 4, borderRadius: 999 },
    title: { fontSize: scaleBySizeClass(18, sizeClass), fontFamily: Fonts.bold, marginBottom: 14 },
    preset: {
      minHeight: 72,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    presetText: { flex: 1, gap: 3 },
    presetName: { fontSize: scaleBySizeClass(16, sizeClass), fontFamily: Fonts.bold },
    count: { fontSize: scaleBySizeClass(12, sizeClass) },
    names: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
    pressed: { opacity: 0.8 },
  });
}
