import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';
import { AlertModal } from './AlertModal';

interface ShareConfirmModalProps {
  visible: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ShareConfirmModal({ visible, onConfirm, onCancel }: ShareConfirmModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [isLoading, setIsLoading] = useState(false);

  const handleProceed = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    onCancel();
  };

  return (
    <AlertModal visible={visible} title="Share Data?" onClose={handleCancel}>
      <ThemedText style={[styles.body, { color: palette.textMuted }]}>
        By proceeding, anyone with the generated link can view your game/team data including names,
        lines, and stats.
      </ThemedText>
      <ThemedText style={[styles.body, { color: palette.textMuted }]}>
        The link expires after 30 days.
      </ThemedText>

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
            pressed && !isLoading && styles.buttonPressed,
            isLoading && { opacity: 0.5 },
          ]}
          onPress={handleCancel}
          disabled={isLoading}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.accent },
            pressed && !isLoading && styles.buttonPressed,
            isLoading && { opacity: 0.8 },
          ]}
          onPress={handleProceed}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={palette.textOnAccent} />
          ) : (
            <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
              Proceed
            </ThemedText>
          )}
        </Pressable>
      </View>
    </AlertModal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    body: {
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
      marginBottom: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    cancelButton: {
      borderWidth: 1,
    },
    buttonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}
