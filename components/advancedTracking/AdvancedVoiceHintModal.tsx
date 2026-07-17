import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface AdvancedVoiceHintModalProps {
  visible: boolean;
  onDismiss: () => void;
  onContinue: () => void;
}

export function AdvancedVoiceHintModal({
  visible,
  onDismiss,
  onContinue,
}: AdvancedVoiceHintModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <BottomSheet
        onDismiss={onDismiss}
        sheetStyle={{ backgroundColor: palette.primary, borderColor: palette.overlay20 }}>
        <View style={styles.content}>
          <View style={[styles.icon, { backgroundColor: palette.accentOverlay15 }]}>
            <MaterialCommunityIcons
              name="microphone-message"
              size={scaleBySizeClass(28, sizeClass)}
              color={palette.accent}
            />
          </View>
          <ThemedText style={[styles.title, { color: palette.textInverse }]}>
            Voice Works Best With Numbers
          </ThemedText>
          <ThemedText style={[styles.body, { color: palette.textMuted }]}>
            Jersey numbers are more reliable than names. Say “number 34” to pass to player #34.
            Names are supported, but may be less reliable.
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              testID="voice-hint-dismiss"
              onPress={onDismiss}
              style={[styles.button, { borderColor: palette.overlay15 }]}>
              <ThemedText style={[styles.secondaryText, { color: palette.textMuted }]}>
                NOT NOW
              </ThemedText>
            </Pressable>
            <Pressable
              testID="voice-hint-continue"
              onPress={onContinue}
              style={[styles.button, { backgroundColor: palette.accent }]}>
              <ThemedText style={[styles.primaryText, { color: palette.textOnAccent }]}>
                CONTINUE
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    content: { padding: 20, gap: 12, alignItems: 'center' },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
    },
    body: {
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
      maxWidth: 480,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
    button: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    secondaryText: { fontFamily: Fonts.bold, fontSize: scaleBySizeClass(12, sizeClass) },
    primaryText: { fontFamily: Fonts.black, fontSize: scaleBySizeClass(12, sizeClass) },
  });
}
