import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAutoDismissFeedback } from '@/hooks/useAutoDismissFeedback';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TrackerVoiceFeedbackPillProps {
  controls: VoiceStatCommandsControls;
  compact?: boolean;
}

export const TrackerVoiceFeedbackPill = ({
  controls,
  compact = false,
}: TrackerVoiceFeedbackPillProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, compact);

  const autoDismiss =
    controls.feedback.kind === 'recorded' ||
    (controls.feedback.kind === 'issue' && !controls.feedback.persistent);
  const dismissed = useAutoDismissFeedback(autoDismiss, controls.feedback.text);

  const hidden = dismissed || (controls.feedback.kind === 'idle' && !controls.isListening);
  if (hidden) return null;

  const color = getFeedbackColor(controls.feedback.kind, palette);
  const icon = getFeedbackIcon(controls.feedback.kind, controls.isListening);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          backgroundColor: palette.glassBg,
          borderColor: controls.isListening ? palette.accentOverlay30 : palette.overlay15,
          shadowColor: palette.shadow,
        },
      ]}>
      <MaterialCommunityIcons
        name={icon}
        size={scaleBySizeClass(compact ? 14 : 16, sizeClass)}
        color={color}
        style={styles.icon}
      />
      <ThemedText numberOfLines={1} style={[styles.text, { color }]}>
        {controls.feedback.text}
      </ThemedText>
    </View>
  );
};

function getFeedbackColor(
  kind: VoiceStatCommandsControls['feedback']['kind'],
  palette: Palette,
): string {
  if (kind === 'issue') return palette.warning;
  if (kind === 'recorded') return palette.success;
  return palette.accent;
}

function getFeedbackIcon(
  kind: VoiceStatCommandsControls['feedback']['kind'],
  isListening: boolean,
): keyof typeof MaterialCommunityIcons.glyphMap {
  if (kind === 'issue') return 'alert-circle';
  if (kind === 'recorded') return 'check-circle';
  if (isListening) return 'microphone';
  return 'message-text';
}

function createStyles(sizeClass: SizeClass, compact: boolean) {
  return StyleSheet.create({
    pill: {
      minHeight: scaleBySizeClass(compact ? 34 : 40, sizeClass),
      borderRadius: scaleBySizeClass(compact ? 17 : 20, sizeClass),
      borderCurve: 'continuous',
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(compact ? 10 : 14, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    icon: {
      marginRight: scaleBySizeClass(7, sizeClass),
    },
    text: {
      flexShrink: 1,
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(compact ? 10 : 12, sizeClass),
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  });
}
