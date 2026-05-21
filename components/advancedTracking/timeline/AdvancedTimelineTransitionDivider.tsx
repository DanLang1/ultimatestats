import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getTransitionIcon,
  getTransitionLabel,
} from '@/lib/advancedTracking/advancedTimelineUtils';
import type { BetweenPointTransition, GameTransition } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AdvancedTimelineTransitionDividerProps {
  transition: BetweenPointTransition | GameTransition;
  sideLabels: Record<string, string>;
}

export default function AdvancedTimelineTransitionDivider({
  transition,
  sideLabels,
}: AdvancedTimelineTransitionDividerProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const isGameTransition =
    transition.transitionType === 'halftime' ||
    transition.transitionType === 'soft_cap' ||
    transition.transitionType === 'hard_cap';
  const color = isGameTransition ? palette.warning : palette.accent;
  const backgroundColor = isGameTransition ? palette.warningOverlay10 : palette.accentOverlay10;
  const sideLabel =
    'sideId' in transition && transition.sideId != null ? sideLabels[transition.sideId] : undefined;

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: palette.overlay10 }]} />
      <View style={[styles.badge, { backgroundColor, borderColor: color }]}>
        <MaterialCommunityIcons
          name={getTransitionIcon(transition)}
          size={scaleBySizeClass(14, sizeClass)}
          color={color}
        />
        <ThemedText style={[styles.label, { color }]}>
          {getTransitionLabel(transition)}
          {sideLabel ? ` · ${sideLabel}` : ''}
        </ThemedText>
      </View>
      <View style={[styles.line, { backgroundColor: palette.overlay10 }]} />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: -2,
      paddingHorizontal: 6,
    },
    line: {
      flex: 1,
      height: 1,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    label: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
  });
}
