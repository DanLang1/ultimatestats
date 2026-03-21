import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';
import Svg, { Circle } from 'react-native-svg';

interface PlayingTimeGaugeProps {
  percentage: number;
  centerLabel: string;
  centerSubLabel: string;
  bottomLabel?: string;
  color: string;
  sizeClass: SizeClass;
}

export default function PlayingTimeGauge({
  percentage,
  centerLabel,
  centerSubLabel,
  bottomLabel,
  color,
  sizeClass,
}: PlayingTimeGaugeProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  const radius = scaleBySizeClass(34, sizeClass);
  const strokeWidth = scaleBySizeClass(8, sizeClass);
  const halfSize = radius + strokeWidth;
  const size = halfSize * 2;
  const circumference = 2 * Math.PI * radius;

  // Ensure percentage is between 0 and 100
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const centerLabelLength = centerLabel.length;
  const centerLabelStyle =
    centerLabelLength >= 4
      ? styles.centerLabelLong
      : centerLabelLength === 3
        ? styles.centerLabelMedium
        : styles.centerLabel;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            stroke={palette.overlay08}
            fill="none"
            cx={halfSize}
            cy={halfSize}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={color}
            fill="none"
            cx={halfSize}
            cy={halfSize}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${halfSize}, ${halfSize}`}
          />
        </Svg>
        <View style={[styles.centerContent, { paddingHorizontal: strokeWidth * 1.5 }]}>
          <ThemedText style={[centerLabelStyle, { color: palette.textInverse }]} numberOfLines={1}>
            {centerLabel}
          </ThemedText>
          <ThemedText
            style={[styles.centerSubLabel, { color: palette.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {centerSubLabel}
          </ThemedText>
        </View>
      </View>
      {bottomLabel && (
        <ThemedText style={[styles.bottomLabel, { color: palette.textMuted }]}>
          {bottomLabel}
        </ThemedText>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    centerContent: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(26, sizeClass),
    },
    centerLabelMedium: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    centerLabelLong: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    centerSubLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bottomLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
