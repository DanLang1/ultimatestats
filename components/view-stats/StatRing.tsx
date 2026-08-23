import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface StatRingProps {
  percentage: number | null;
  label: string;
  sublabel: string;
  info: string;
  infoLabel: string;
  testID?: string;
}

/** Full circle donut gauge component using react-native-svg. */
export default function StatRing({
  percentage,
  label,
  sublabel,
  info,
  infoLabel,
  testID,
}: StatRingProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();

  // Clamp percentage between 0-100
  const clampedPercent = Math.max(0, Math.min(100, percentage ?? 0));

  // Format percentage display — rounded to avoid cramped decimals in rings
  const displayValue = percentage == null ? '—' : `${Math.round(percentage)}%`;

  const size = scaleBySizeClass(90, sizeClass);
  const strokeWidth = scaleBySizeClass(14, sizeClass);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const handleInfoPress = () => {
    if (info) {
      showAlert({ title: infoLabel, message: info });
    }
  };

  return (
    <View testID={testID} style={styles.container}>
      <View style={{ height: size, width: size }}>
        <Svg width={size} height={size}>
          <Circle
            stroke={palette.overlay15}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {clampedPercent > 0 && (
            <Circle
              stroke={palette.accent}
              fill="none"
              cx={center}
              cy={center}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          )}
        </Svg>
        {/* Centered percentage overlay */}
        <View style={styles.valueContainer}>
          <ThemedText
            testID={testID ? `${testID}-value` : undefined}
            style={[styles.percentage, { color: palette.textInverse }]}>
            {displayValue}
          </ThemedText>
        </View>
      </View>
      {/* Label row with info button */}
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: palette.textInverse }]}>{label}</ThemedText>
        {info && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`About ${infoLabel}`}
            onPress={handleInfoPress}
            hitSlop={8}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        )}
      </View>
      {sublabel && (
        <ThemedText
          testID={testID ? `${testID}-ratio` : undefined}
          style={[styles.sublabel, { color: palette.textMuted }]}>
          {sublabel}
        </ThemedText>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 4,
    },
    valueContainer: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentage: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    label: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sublabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
