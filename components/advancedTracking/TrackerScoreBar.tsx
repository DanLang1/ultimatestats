import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerScoreBarProps {
  focusSideName: string;
  focusScore: number;
  focusTimeoutsUsed: number;
  oppTimeoutsUsed: number;
  maxTimeouts: number;
  oppSideName: string;
  oppScore: number;
  onHomePress: () => void;
  onFocusTimeout: () => void;
  onOppTimeout: () => void;
  topInset: number;
  isLandscape?: boolean;
}

export const TrackerScoreBar = ({
  focusSideName,
  focusScore,
  focusTimeoutsUsed,
  oppTimeoutsUsed,
  maxTimeouts,
  oppSideName,
  oppScore,
  onHomePress,
  onFocusTimeout,
  onOppTimeout,
  topInset,
  isLandscape = false,
}: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const renderPips = (timeoutsUsed: number, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.timeoutPips, pressed && { opacity: 0.6 }]}>
      {Array.from({ length: maxTimeouts }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.pip,
            {
              backgroundColor: i < maxTimeouts - timeoutsUsed ? palette.accent : palette.overlay20,
              boxShadow: i < maxTimeouts - timeoutsUsed ? `0 0 8px ${palette.accent}` : undefined,
            },
          ]}
        />
      ))}
    </Pressable>
  );

  if (isLandscape) {
    return (
      <View style={[styles.landscapeContainer, { paddingTop: Math.max(topInset, 8) }]}>
        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
          {renderPips(focusTimeoutsUsed, onFocusTimeout)}
          <Pressable
            onPress={onHomePress}
            hitSlop={12}
            style={({ pressed }) => [
              styles.homeBtn,
              { backgroundColor: palette.overlay08 },
              pressed && { opacity: 0.7, backgroundColor: palette.overlay15 },
            ]}>
            <MaterialCommunityIcons
              name="home-outline"
              size={scaleBySizeClass(16, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {oppSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {oppScore}
          </ThemedText>
          {renderPips(oppTimeoutsUsed, onOppTimeout)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.scoreBarContainer, { paddingTop: Math.max(topInset, 16) }]}>
      <View
        style={[
          styles.scoreBar,
          {
            backgroundColor: palette.glassBg,
            borderColor: palette.overlay15,
            boxShadow: `0 8px 32px ${palette.overlay10}`,
          },
        ]}>
        <View style={styles.teamBlock}>
          <ThemedText style={[styles.teamName, { color: palette.textMuted }]} numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.scoreNum, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
          {renderPips(focusTimeoutsUsed, onFocusTimeout)}
        </View>

        <View style={styles.clockBlock}>
          <View
            style={[
              styles.clockWrap,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}>
            <ThemedText style={[styles.clock, { color: palette.textInverse }]}>00:00</ThemedText>
          </View>
          <Pressable
            onPress={onHomePress}
            hitSlop={12}
            style={({ pressed }) => [
              styles.homeBtn,
              { backgroundColor: palette.overlay08 },
              pressed && { opacity: 0.7, backgroundColor: palette.overlay15 },
            ]}>
            <MaterialCommunityIcons
              name="home-outline"
              size={scaleBySizeClass(18, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>

        <View style={[styles.teamBlock, styles.teamBlockRight]}>
          <ThemedText style={[styles.teamName, { color: palette.textMuted }]} numberOfLines={1}>
            {oppSideName}
          </ThemedText>
          <ThemedText style={[styles.scoreNum, { color: palette.textInverse }]}>
            {oppScore}
          </ThemedText>
          {renderPips(oppTimeoutsUsed, onOppTimeout)}
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    scoreBarContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      zIndex: 10,
    },
    scoreBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 24,
      borderCurve: 'continuous',
      borderWidth: 1,
    },
    teamBlock: {
      flex: 1,
      alignItems: 'flex-start',
      gap: 4,
    },
    teamBlockRight: {
      alignItems: 'flex-end',
    },
    teamName: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    scoreNum: {
      fontSize: scaleBySizeClass(42, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
    },
    timeoutPips: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    pip: {
      width: 12,
      height: 4,
      borderRadius: 2,
    },
    landscapeContainer: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    landscapeTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    landscapeTeamName: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    landscapeScore: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
    },
    landscapeDivider: {
      height: 1,
      marginVertical: 4,
    },
    clockBlock: {
      alignItems: 'center',
      paddingHorizontal: 10,
      gap: 10,
    },
    clockWrap: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 12,
      borderCurve: 'continuous',
      borderWidth: 1,
    },
    clock: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
    },
    homeBtn: {
      padding: 8,
      borderRadius: 12,
      borderCurve: 'continuous',
    },
  });
}
