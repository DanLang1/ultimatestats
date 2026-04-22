import { ThemedText } from '@/components/ThemedText';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, useLayout } from '@/hooks/useLayout';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface TutorialSettingsBarProps {
  // Message-only mode (score step)
  message?: string;
  onMessagePress?: () => void;

  // Play / timer
  showPlay?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  highlightPlay?: boolean;
  timeLeft?: number;

  // Ratio label (e.g., "M1")
  ratioLabel?: string;

  // Undo
  onUndo?: () => void;
  canUndo?: boolean;
  highlightUndo?: boolean;

  // Message tap hint
  highlightMessage?: boolean;
}

export default function TutorialSettingsBar({
  message,
  onMessagePress,
  showPlay = false,
  isPlaying = false,
  onPlay,
  highlightPlay = false,
  timeLeft,
  ratioLabel,
  onUndo,
  canUndo = false,
  highlightUndo = false,
  highlightMessage = false,
}: TutorialSettingsBarProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const iconSize = getSizeClassValue({ small: 24, medium: 26, large: 28 }, sizeClass);

  const undoPulseStyle = usePulseAnimation(highlightUndo);
  const playPulseStyle = usePulseAnimation(highlightPlay);
  const chevronPulseStyle = usePulseAnimation(highlightMessage);

  const barBg = palette.glassBg;
  const barContentColor = palette.textInverse;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (message) {
    const MessageContainer = onMessagePress ? Pressable : View;
    return (
      <MessageContainer
        onPress={onMessagePress}
        style={[
          styles.container,
          styles.containerMessage,
          { backgroundColor: barBg, shadowColor: palette.shadow },
        ]}>
        <ThemedText style={[styles.messageText, { color: barContentColor }]}>{message}</ThemedText>
        {onMessagePress ? (
          <Animated.View style={chevronPulseStyle}>
            <MaterialCommunityIcons name="chevron-right" size={iconSize} color={barContentColor} />
          </Animated.View>
        ) : null}
      </MessageContainer>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: barBg, shadowColor: palette.shadow }]}>
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

      {/* Timer */}
      {timeLeft !== undefined && (
        <View style={styles.timerContainer}>
          <ThemedText style={[styles.timerText, { color: barContentColor }]}>
            {formatTime(timeLeft)}
          </ThemedText>
        </View>
      )}

      {/* Ratio label */}
      {ratioLabel && (
        <View style={styles.ratioContainer}>
          <ThemedText style={[styles.ratioText, { color: barContentColor }]}>
            {ratioLabel}
          </ThemedText>
        </View>
      )}

      {/* Undo */}
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
  const ratioTextSize = getSizeClassValue({ small: 18, medium: 20, large: 22 }, sizeClass);
  const iconButtonPadding = getSizeClassValue({ small: 5, medium: 7, large: 8 }, sizeClass);

  return StyleSheet.create({
    container: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderRadius: isLandscape ? 0 : 20,
      alignItems: 'center',
      justifyContent: 'center',
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
      gap: 5,
    },
    timerText: {
      fontSize: timerTextSize,
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    ratioContainer: {
      alignSelf: 'center',
    },
    ratioText: {
      fontSize: ratioTextSize,
      fontFamily: Fonts.bold,
    },
    iconButton: {
      padding: iconButtonPadding,
    },
    iconButtonDisabled: {
      opacity: 0.3,
    },
    buttonHighlight: {
      ...StyleSheet.absoluteFill,
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
