import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerVoiceButtonProps {
  controls: VoiceStatCommandsControls;
  disabled: boolean;
}

export const TrackerVoiceButton = ({ controls, disabled }: TrackerVoiceButtonProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const isActive = controls.isListening;
  const label = isActive ? 'RELEASE' : 'HOLD TO SPEAK';
  const icon = isActive ? 'stop-circle' : 'microphone';
  const accentColor = getAccentColor(controls.status, palette);

  return (
    <Pressable
      testID="tracker-voice-button"
      accessibilityRole="button"
      accessibilityLabel={isActive ? 'Release to stop voice command' : 'Hold for voice command'}
      disabled={disabled}
      onPressIn={controls.startListening}
      onPressOut={controls.stopListening}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isActive ? palette.accentOverlay15 : palette.overlay05,
          borderColor: isActive ? palette.accentOverlay30 : palette.overlay10,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={icon}
            size={scaleBySizeClass(22, sizeClass)}
            color={accentColor}
            style={styles.icon}
          />
          <ThemedText numberOfLines={1} style={[styles.buttonText, { color: accentColor }]}>
            {label}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
};

function getAccentColor(status: VoiceStatCommandsControls['status'], palette: Palette): string {
  if (status === 'error') return palette.danger;
  if (status === 'unsupported') return palette.neutral;
  return palette.accent;
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    button: {
      flex: 1,
      minHeight: scaleBySizeClass(54, sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      marginRight: 8,
    },
    pressed: {
      opacity: 0.7,
    },
    buttonText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
