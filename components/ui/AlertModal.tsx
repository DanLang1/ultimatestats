import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
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
            <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
          </Pressable>

          <Text style={[styles.title, { color: palette.textInverse }]}>{title}</Text>

          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
});
