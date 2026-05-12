import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DevDebugModalProps {
  visible: boolean;
  onClose: () => void;
  data: unknown;
}

export const DevDebugModal = ({ visible, onClose, data }: DevDebugModalProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const debugText = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(debugText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: palette.overlayDark88,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.primary,
              borderColor: palette.overlay20,
            },
          ]}>
          <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <View>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                Debug Data
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
                Selectable JSON for the current advanced game
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={16} style={styles.iconButton}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textInverse}
              />
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleCopy}
              style={[
                styles.copyButton,
                {
                  backgroundColor: copied ? palette.successOverlay10 : palette.accentOverlay10,
                  borderColor: copied ? palette.successOverlay15 : palette.accentOverlay30,
                },
              ]}>
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={scaleBySizeClass(16, sizeClass)}
                color={copied ? palette.success : palette.accent}
              />
              <ThemedText
                style={[
                  styles.copyButtonText,
                  { color: copied ? palette.success : palette.accent },
                ]}>
                {copied ? 'Copied' : 'Copy All'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            style={[styles.scrollBox, { backgroundColor: palette.overlay05 }]}
            contentContainerStyle={styles.scrollContent}>
            <ThemedText style={[styles.codeText, { color: palette.textInverse }]} selectable>
              {debugText}
            </ThemedText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

function createStyles(sizeClass: ReturnType<typeof useLayout>['sizeClass']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    panel: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    subtitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginTop: 2,
    },
    iconButton: {
      padding: 4,
    },
    actionsRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    copyButtonText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
    },
    scrollBox: {
      flex: 1,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 8,
    },
    scrollContent: {
      padding: 12,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: scaleBySizeClass(11, sizeClass),
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
  });
}
