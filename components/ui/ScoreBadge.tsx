import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface ScoreBadgeProps {
  score1: number;
  score2: number;
  size?: 'small' | 'medium' | 'large';
  sizeClass?: SizeClass;
  style?: ViewStyle;
  testID?: string;
}

export function ScoreBadge({
  score1,
  score2,
  size = 'medium',
  sizeClass = 'small',
  style,
  testID,
}: ScoreBadgeProps) {
  const { palette } = useTheme();

  const isWin = score1 > score2;
  const isLoss = score1 < score2;

  const getColors = () => {
    if (isWin) {
      return {
        bg: palette.successOverlay15,
        border: palette.success,
        text: palette.success,
      };
    }
    if (isLoss) {
      return {
        bg: palette.dangerOverlay15,
        border: palette.danger,
        text: palette.danger,
      };
    }
    return {
      bg: palette.warningOverlay15,
      border: palette.warning,
      text: palette.warning,
    };
  };

  const colors = getColors();

  const sizeStyles = styles[size];
  const textSize = textSizes[size];

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        sizeStyles,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}>
      <ThemedText
        style={[
          styles.text,
          {
            fontSize: scaleBySizeClass(textSize, sizeClass),
            color: colors.text,
          },
        ]}>
        {score1} - {score2}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  large: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  text: {
    fontFamily: Fonts.bold,
  },
});

const textSizes = {
  small: 13,
  medium: 16,
  large: 19,
} as const;
