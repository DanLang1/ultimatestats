import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

interface StatRingProps {
  percentage: number;
  label: string;
  sublabel: string;
  info: string;
  infoLabel: string;
}

/**
 * Full circle donut gauge component using Victory Native.
 * Displays a complete ring filled proportionally to the percentage.
 */
export default function StatRing({ percentage, label, sublabel, info, infoLabel }: StatRingProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();

  // Clamp percentage between 0-100
  const clampedPercent = Math.max(0, Math.min(100, percentage));
  const remaining = 100 - clampedPercent;

  // Data for the donut chart - filled portion first so it starts from top
  const data = [
    { value: clampedPercent, color: palette.accent, label: 'filled' },
    { value: remaining, color: palette.overlay15, label: 'empty' },
  ];

  // Format percentage display
  const displayValue = Number.isInteger(percentage)
    ? `${Math.round(percentage)}%`
    : `${percentage.toFixed(1)}%`;

  const size = scaleBySizeClass(90, sizeClass);

  const handleInfoPress = () => {
    if (info) {
      showAlert({ title: infoLabel, message: info });
    }
  };

  return (
    <View style={styles.container}>
      {/* Container must have explicit height for PolarChart to render */}
      <View style={{ height: size, width: size }}>
        <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart innerRadius="70%" startAngle={-90}>
            {() => <Pie.Slice />}
          </Pie.Chart>
        </PolarChart>
        {/* Centered percentage overlay */}
        <View style={styles.valueContainer}>
          <Text style={[styles.percentage, { color: palette.textInverse }]}>{displayValue}</Text>
        </View>
      </View>
      {/* Label row with info button */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.textInverse }]}>{label}</Text>
        {info && (
          <Pressable onPress={handleInfoPress} hitSlop={8}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        )}
      </View>
      {sublabel && <Text style={[styles.sublabel, { color: palette.textMuted }]}>{sublabel}</Text>}
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
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentage: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '700',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    label: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sublabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
    },
  });
}
