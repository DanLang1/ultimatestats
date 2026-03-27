import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TutorialTooltipProps {
  title: string;
  message?: string;
  stepIndex: number;
  position: 'top' | 'bottom' | 'center';
}

export default function TutorialTooltip({
  title,
  message,
  stepIndex,
  position,
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
      <View
        style={[
          styles.container,
          { backgroundColor: palette.modalBg, shadowColor: palette.shadow },
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
      </View>
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
  });
}
