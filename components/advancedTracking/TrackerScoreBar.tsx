import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getSideTimeoutState,
  SideTimeoutState,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { getSideScore } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TrackerScoreBar = () => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();

  const { currentGameId, savedGames } = useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const focusSideName = game.sides.find((s) => s.id === game.focusSideId)?.label ?? '';
  const oppSideName = oppSide.label;
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = getSideScore(game, oppSide.id);
  const focusTimeouts = getSideTimeoutState(game, game.focusSideId);
  const oppTimeouts = getSideTimeoutState(game, oppSide.id);

  const renderPips = (state: SideTimeoutState) => {
    const regularsRemaining = Math.max(state.regularPerHalf - state.regularUsedInHalf, 0);
    return (
      <View style={styles.timeoutPips}>
        {Array.from({ length: state.regularPerHalf }).map((_, i) => {
          const active = i < regularsRemaining;
          return (
            <View
              key={`r${i}`}
              style={[
                styles.pip,
                {
                  backgroundColor: active ? palette.accent : palette.overlay20,
                  boxShadow: active ? `0 0 8px ${palette.accent}` : undefined,
                },
              ]}
            />
          );
        })}
        {state.floaterEnabled && (
          <View
            style={[
              styles.floaterPip,
              {
                borderColor: state.floaterUsed ? palette.overlay20 : palette.accent,
                backgroundColor: state.floaterUsed ? 'transparent' : palette.accent,
                boxShadow: state.floaterUsed ? undefined : `0 0 8px ${palette.accent}`,
              },
            ]}
          />
        )}
      </View>
    );
  };

  if (isLandscape) {
    return (
      <View style={[styles.landscapeContainer, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
          {renderPips(focusTimeouts)}
          <Pressable
            onPress={() => router.dismissTo('/Dashboard')}
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
          {renderPips(oppTimeouts)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.scoreBarContainer, { paddingTop: Math.max(insets.top, 16) }]}>
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
          {renderPips(focusTimeouts)}
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
            onPress={() => router.dismissTo('/Dashboard')}
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
          {renderPips(oppTimeouts)}
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
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    pip: {
      width: 12,
      height: 4,
      borderRadius: 2,
    },
    floaterPip: {
      width: 6,
      height: 6,
      borderRadius: 1,
      borderWidth: 1,
      transform: [{ rotate: '45deg' }],
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
