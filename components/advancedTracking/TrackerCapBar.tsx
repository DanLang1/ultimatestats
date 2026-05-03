import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerCapBarProps {
  /** Compact layout for landscape side panel. */
  compact: boolean;
  onMenuPress: () => void;
  capLabel: string;
  capProgress: number;
  capIsWarning: boolean;
  capTimeLeftMs: number;
  gameStarted: boolean;
}

export const TrackerCapBar = ({
  compact,
  onMenuPress,
  capLabel,
  capProgress,
  capIsWarning,
  capTimeLeftMs,
  gameStarted,
}: TrackerCapBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, compact);
  const capFillColor = capIsWarning ? palette.danger : palette.accent;
  const capTextColor = capIsWarning ? palette.danger : palette.textMuted;

  return (
    <View style={styles.container}>
      <Pressable onPress={onMenuPress} hitSlop={12} style={compact && styles.menuBtnCompact}>
        <MaterialCommunityIcons
          name="menu"
          size={scaleBySizeClass(compact ? 20 : 24, sizeClass)}
          color={palette.textInverse}
        />
      </Pressable>
      <View style={compact ? styles.centerCompact : styles.center}>
        {compact ? (
          <ThemedText style={[styles.labelCompact, { color: capTextColor }]} numberOfLines={1}>
            {capLabel}
          </ThemedText>
        ) : (
          <View style={styles.labelRow}>
            <ThemedText style={[styles.label, { color: capTextColor }]}>{capLabel}</ThemedText>
            <ThemedText style={[styles.timeLeft, { color: capTextColor }]}>
              {gameStarted ? `${formatPointTime(capTimeLeftMs)} left` : '—'}
            </ThemedText>
          </View>
        )}
        <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
          <View
            style={[
              styles.barFill,
              { width: `${capProgress * 100}%`, backgroundColor: capFillColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, compact: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: compact ? 'center' : 'flex-start',
      paddingLeft: compact ? 12 : 0,
      paddingTop: compact ? 2 : 6,
      paddingHorizontal: compact ? 0 : 14,
      paddingBottom: 4,
      gap: compact ? 6 : 10,
    },
    menuBtnCompact: {
      paddingTop: 2,
    },
    center: {
      flex: 1,
    },
    centerCompact: {
      flex: 1,
      minWidth: 0,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.5,
    },
    labelCompact: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      marginBottom: 2,
    },
    timeLeft: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
    },
    barTrack: {
      borderRadius: 999,
      overflow: 'hidden',
      height: compact ? 4 : 5,
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
    },
  });
}
