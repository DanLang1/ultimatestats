import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTutorialStore } from '@/store/tutorialStore';
import { AdvancedVoiceHintModal } from './AdvancedVoiceHintModal';

const VOICE_BUTTON_HEIGHT = 62;

interface TrackerVoiceButtonProps {
  controls: VoiceStatCommandsControls;
  disabled: boolean;
}

export const TrackerVoiceButton = ({ controls, disabled }: TrackerVoiceButtonProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const hasSeenAdvancedVoiceHint = useTutorialStore((state) => state.hasSeenAdvancedVoiceHint);
  const [showVoiceHint, setShowVoiceHint] = useState(false);

  const isActive = controls.isListening;
  const label = isActive ? 'CANCEL' : 'TAP TO SPEAK';
  const icon = isActive ? 'stop-circle' : 'microphone';
  const accentColor = getAccentColor(controls.status, palette);
  const dismissVoiceHint = () => {
    useTutorialStore.getState().dismissAdvancedVoiceHint();
    setShowVoiceHint(false);
  };
  const continueToVoice = () => {
    dismissVoiceHint();
    controls.toggleListening();
  };
  const handlePress = () => {
    if (!hasSeenAdvancedVoiceHint) {
      setShowVoiceHint(true);
      return;
    }
    controls.toggleListening();
  };

  return (
    <>
      <Pressable
        testID="tracker-voice-button"
        accessibilityRole="button"
        accessibilityLabel={isActive ? 'Cancel voice command' : 'Start voice command'}
        disabled={disabled}
        onPress={handlePress}
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
      <AdvancedVoiceHintModal
        visible={showVoiceHint}
        onDismiss={dismissVoiceHint}
        onContinue={continueToVoice}
      />
    </>
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
      minHeight: scaleBySizeClass(VOICE_BUTTON_HEIGHT, sizeClass),
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
