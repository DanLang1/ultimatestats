import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface TrackerHomeMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const TrackerHomeMenu = ({ visible, onClose }: TrackerHomeMenuProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleGoHome = () => {
    onClose();
    router.dismissTo('/Dashboard');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={[styles.sheet, { backgroundColor: palette.primary }]}
        minBottomPadding={12}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />

          <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <ThemedText style={[styles.title, { color: palette.textMuted }]}>MENU</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={handleGoHome}
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
                name="home-outline"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.accent}
              />
            </View>
            <ThemedText style={[styles.actionLabel, { color: palette.textInverse }]}>
              Home
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '45%',
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
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
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
      width: scaleBySizeClass(36, sizeClass),
      height: scaleBySizeClass(36, sizeClass),
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
