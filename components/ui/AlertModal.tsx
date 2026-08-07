import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface AlertModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A reusable modal component matching the AlertProvider styling.
 * Provides consistent overlay, container, close button, and title.
 * Custom content is passed via children.
 */
export function AlertModal({ visible, title, onClose, children }: AlertModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}>
      <View style={[styles.overlay, { backgroundColor: palette.overlayDark70 }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: palette.secondary, borderColor: palette.overlay20 },
          ]}>
          {/* Close icon */}
          <Pressable
            style={[styles.closeButton, { backgroundColor: palette.overlay10 }]}
            onPress={onClose}
            hitSlop={8}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <ThemedText style={[styles.title, { color: palette.textInverse }]}>{title}</ThemedText>

          {children}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  const modalMaxWidth = getSizeClassValue({ small: 340, medium: 420, large: 520 }, sizeClass);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    container: {
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: modalMaxWidth,
      borderWidth: 1,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 4,
      borderRadius: 12,
      zIndex: 1,
    },
    title: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
      marginBottom: 16,
    },
  });
}
