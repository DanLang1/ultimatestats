import { ThemedText } from '@/components/ThemedText';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface TutorialSettingsBarProps {
  // Message-only mode (score step)
  message?: string;

  // Play / timer
  showPlay?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  highlightPlay?: boolean;
  timeLeft?: number;

  // Undo
  onUndo?: () => void;
  canUndo?: boolean;
  highlightUndo?: boolean;
}

export default function TutorialSettingsBar({
  message,
  showPlay = false,
  isPlaying = false,
  onPlay,
  highlightPlay = false,
  timeLeft,
  onUndo,
  canUndo = false,
  highlightUndo = false,
}: TutorialSettingsBarProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const iconSize = getSizeClassValue({ small: 24, medium: 26, large: 28 }, sizeClass);

  const undoPulseStyle = usePulseAnimation(highlightUndo);
  const playPulseStyle = usePulseAnimation(highlightPlay);

  const barBg = palette.glassBg;
  const barContentColor = palette.textInverse;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (message) {
    return (
      <View style={[styles.container, styles.containerMessage, { backgroundColor: barBg }]}>
        <ThemedText style={[styles.messageText, { color: barContentColor }]}>{message}</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: barBg }]}>
      {showPlay && (
        <Pressable onPress={onPlay} style={styles.iconButton}>
          {highlightPlay && (
            <>
              <Animated.View
                style={[styles.buttonHighlight, { borderColor: palette.accent }, playPulseStyle]}
              />
              <TutorialAnimatedArrow
                direction="down"
                color={palette.accent}
                size={20}
                style={styles.buttonArrow}
              />
            </>
          )}
          <MaterialCommunityIcons
            name={isPlaying ? 'pause' : 'play'}
            size={iconSize}
            color={barContentColor}
          />
        </Pressable>
      )}

      {timeLeft !== undefined && (
        <View style={styles.timerContainer}>
          <ThemedText style={[styles.timerText, { color: barContentColor }]}>
            {formatTime(timeLeft)}
          </ThemedText>
        </View>
      )}

      {onUndo && (
        <Pressable
          onPress={onUndo}
          style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
          disabled={!canUndo}>
          {highlightUndo && (
            <>
              <Animated.View
                style={[styles.buttonHighlight, { borderColor: palette.accent }, undoPulseStyle]}
              />
              <TutorialAnimatedArrow
                direction="down"
                color={palette.accent}
                size={20}
                style={styles.buttonArrow}
              />
            </>
          )}
          <MaterialCommunityIcons name="undo" size={iconSize} color={barContentColor} />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: 'small' | 'medium' | 'large') {
  const horizontalPadding = getSizeClassValue({ small: 20, medium: 24, large: 28 }, sizeClass);
  const verticalPadding = getSizeClassValue({ small: 10, medium: 12, large: 14 }, sizeClass);
  const minHeight = getSizeClassValue({ small: 50, medium: 58, large: 64 }, sizeClass);
  const gap = getSizeClassValue({ small: 15, medium: 18, large: 22 }, sizeClass);
  const timerTextSize = getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass);
  const iconButtonPadding = getSizeClassValue({ small: 5, medium: 7, large: 8 }, sizeClass);

  return StyleSheet.create({
    container: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderRadius: isLandscape ? 0 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      paddingHorizontal: horizontalPadding,
      paddingVertical: verticalPadding,
      minHeight,
      minWidth: 220,
      gap,
    },
    containerMessage: {
      justifyContent: 'center',
    },
    messageText: {
      fontSize: getSizeClassValue({ small: 15, medium: 16, large: 17 }, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    timerText: {
      fontSize: timerTextSize,
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    iconButton: {
      padding: iconButtonPadding,
    },
    iconButtonDisabled: {
      opacity: 0.3,
    },
    buttonHighlight: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 2,
      borderRadius: 20,
      margin: -4,
    },
    buttonArrow: {
      position: 'absolute',
      bottom: '100%',
      alignSelf: 'center',
      paddingBottom: 2,
    },
  });
}
