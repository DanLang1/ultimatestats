import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TutorialTooltipProps {
  title: string;
  message?: string;
  stepIndex: number;
  position: 'top' | 'bottom' | 'center';
  onPress?: () => void;
}

export default function TutorialTooltip({
  title,
  message,
  stepIndex,
  position,
  onPress,
}: TutorialTooltipProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, position);

  return (
    <Animated.View
      key={stepIndex}
      entering={FadeIn.duration(200)}
      style={styles.wrapper}
      pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={[
          styles.container,
          {
            backgroundColor: palette.modalBg,
            shadowColor: palette.shadow,
            borderWidth: 1,
            borderColor: palette.overlay15,
          },
        ]}>
        <ThemedText
          style={[styles.title, { color: palette.modalText }, !message && styles.titleCentered]}>
          {title}
        </ThemedText>

        {message ? (
          <ThemedText style={[styles.message, { color: palette.modalTextMuted }]}>
            {message}
          </ThemedText>
        ) : null}

        {onPress ? (
          <View style={styles.gotItRow}>
            <ThemedText style={[styles.gotItText, { color: palette.accent }]}>Got it</ThemedText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(16, sizeClass)}
              color={palette.accent}
            />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(
  sizeClass: 'small' | 'medium' | 'large',
  position: 'top' | 'bottom' | 'center',
) {
  const positionStyle = (() => {
    switch (position) {
      case 'top':
        return { top: 12 } as const;
      case 'bottom':
        return { bottom: 12 } as const;
      case 'center':
        return { top: 0, bottom: 0, justifyContent: 'center' } as const;
    }
  })();

  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 500,
      alignItems: 'center',
      ...positionStyle,
    },
    container: {
      borderRadius: 14,
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      maxWidth: 400,
      width: '100%',
      gap: scaleBySizeClass(4, sizeClass),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    },
    title: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
    },
    titleCentered: {
      textAlign: 'center',
    },
    message: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    gotItRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: scaleBySizeClass(6, sizeClass),
    },
    gotItText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
