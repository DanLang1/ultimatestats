import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { getFooterActionHeight } from '@/components/advancedTracking/bottomCard/constants';
import { useTheme } from '@/context/ThemeContext';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Palette } from '@/theme/theme';

import { AdvancedVoiceHintModal } from './AdvancedVoiceHintModal';

interface TrackerVoiceButtonProps {
  controls: VoiceStatCommandsControls;
  disabled: boolean;
}

export const TrackerVoiceButton = ({ controls, disabled }: TrackerVoiceButtonProps) => {
  const { palette } = useTheme();
  const { sizeClass, isCompactHeight } = useLayout();
  const styles = createStyles(sizeClass, isCompactHeight);
  const hasSeenAdvancedVoiceHint = useTutorialStore((state) => state.hasSeenAdvancedVoiceHint);
  const [showVoiceHint, setShowVoiceHint] = useState(false);

  const isActive = controls.isListening;
  const icon = isActive ? 'stop-circle' : 'microphone';
  const accentColor = getAccentColor(controls.status, palette);
  const dismissVoiceHint = () => {
    useTutorialStore.getState().dismissAdvancedVoiceHint();
    setShowVoiceHint(false);
  };
  const continueToVoice = async () => {
    dismissVoiceHint();
    await controls.toggleListening();
  };
  const handlePress = async () => {
    if (!hasSeenAdvancedVoiceHint) {
      setShowVoiceHint(true);
      return;
    }
    await controls.toggleListening();
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
            backgroundColor: accentColor,
            borderColor: accentColor,
            opacity: disabled ? 0.4 : 1,
          },
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons
          name={icon}
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.textOnAccent}
        />
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

function createStyles(sizeClass: SizeClass, isCompactHeight: boolean) {
  return StyleSheet.create({
    button: {
      width: scaleBySizeClass(56, sizeClass),
      minHeight: scaleBySizeClass(getFooterActionHeight(isCompactHeight), sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
