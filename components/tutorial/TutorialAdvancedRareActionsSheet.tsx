import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  BottomSheetActionRow,
  BottomSheetActionRowTone,
} from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TutorialAdvancedRareActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPressure: () => void;
}

type RareAction = {
  testID: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: BottomSheetActionRowTone;
  disabled?: boolean;
  onPress: () => void;
};

export default function TutorialAdvancedRareActionsSheet({
  visible,
  onClose,
  onPressure,
}: TutorialAdvancedRareActionsSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const actions: RareAction[] = [
    {
      testID: 'tutorial-pressure-action',
      label: 'Pressure',
      icon: 'shield-outline',
      tone: 'success',
      onPress: onPressure,
    },
    {
      testID: 'tutorial-callahan-action',
      label: 'Callahan',
      icon: 'shield-alert-outline',
      tone: 'success',
      disabled: true,
      onPress: () => {},
    },
    {
      testID: 'tutorial-stall-action',
      label: 'Stall',
      icon: 'timer-alert-outline',
      tone: 'success',
      disabled: true,
      onPress: () => {},
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
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
        ]}
        minBottomPadding={10}>
        <View accessible={false} style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
          <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <ThemedText style={[styles.title, { color: palette.textMuted }]}>
              RARE ACTIONS
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close rare actions">
              <MaterialCommunityIcons
                name="close"
                size={getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>
          <View style={styles.list}>
            {actions.map((action) => (
              <BottomSheetActionRow
                key={action.testID}
                testID={action.testID}
                icon={action.icon}
                label={action.label}
                tone={action.tone}
                disabled={action.disabled}
                onPress={action.onPress}
              />
            ))}
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      marginHorizontal: 0,
      marginBottom: 0,
      borderTopLeftRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderTopRightRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopWidth: 1,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 8,
      overflow: 'hidden',
    },
    content: {
      alignSelf: 'center',
      width: '100%',
      paddingTop: getSizeClassValue({ small: 14, medium: 18, large: 22 }, sizeClass),
      paddingBottom: getSizeClassValue({ small: 8, medium: 10, large: 12 }, sizeClass),
      gap: getSizeClassValue({ small: 12, medium: 16, large: 20 }, sizeClass),
    },
    handle: {
      width: getSizeClassValue({ small: 30, medium: 38, large: 46 }, sizeClass),
      height: getSizeClassValue({ small: 4, medium: 5, large: 6 }, sizeClass),
      borderRadius: 999,
      alignSelf: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: getSizeClassValue({ small: 16, medium: 16, large: 20 }, sizeClass),
      paddingBottom: getSizeClassValue({ small: 12, medium: 14, large: 16 }, sizeClass),
      borderBottomWidth: 1,
    },
    title: {
      fontSize: getSizeClassValue({ small: 12, medium: 13, large: 15 }, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    list: { width: '100%', gap: getSizeClassValue({ small: 4, medium: 6, large: 8 }, sizeClass) },
  });
}
