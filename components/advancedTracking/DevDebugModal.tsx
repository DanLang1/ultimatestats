import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DevDebugModalProps {
  visible: boolean;
  onClose: () => void;
  data: unknown;
}

export const DevDebugModal = ({ visible, onClose, data }: DevDebugModalProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlayDark88 }}>
        <View style={styles.closeRow}>
          <Pressable onPress={onClose} hitSlop={16} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(28, sizeClass)}
              color={palette.primary}
            />
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <ThemedText
            style={[
              styles.text,
              { color: palette.success, fontSize: scaleBySizeClass(11, sizeClass) },
            ]}
            selectable>
            {JSON.stringify(data, null, 2)}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeRow: {
    padding: 16,
    alignItems: 'flex-end',
  },
  closeBtn: {
    padding: 4,
  },
  text: {
    fontFamily: 'monospace',
  },
});
