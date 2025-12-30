import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface ScoreBadgeProps {
  score1: number;
  score2: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function ScoreBadge({ score1, score2, size = 'medium', style }: ScoreBadgeProps) {
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
  const textStyles = textSizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        sizeStyles,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}>
      <Text style={[styles.text, textStyles, { color: colors.text }]}>
        {score1} - {score2}
      </Text>
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
    fontWeight: '700',
  },
});

const textSizeStyles = StyleSheet.create({
  small: {
    fontSize: 13,
  },
  medium: {
    fontSize: 16,
  },
  large: {
    fontSize: 19,
  },
});
