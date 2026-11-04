import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLiveGameScore } from '@/hooks/useLiveGameScore';
import { Fonts } from '@/theme/theme';

/** Pinned row for the game in progress; opens its live stats. */
export default function LiveGameRow() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const liveScore = useLiveGameScore();
  // In a scrimmage neither side is the opponent, so both names keep full weight.
  const opponentColor = liveScore.isScrimmage ? palette.textInverse : palette.textMuted;

  return (
    <Pressable
      testID="stats-live-game"
      accessibilityRole="button"
      accessibilityLabel="Open live game stats"
      onPress={() => router.push('/live-stats')}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: palette.overlay05 },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.liveBadge, { backgroundColor: palette.dangerOverlay15 }]}>
        <View style={[styles.liveDot, { backgroundColor: palette.danger }]} />
        <ThemedText style={[styles.liveBadgeText, { color: palette.danger }]}>LIVE</ThemedText>
      </View>

      <View style={styles.details}>
        <ThemedText style={[styles.matchup, { color: palette.textInverse }]} numberOfLines={1}>
          {liveScore.myTeamName}
          <ThemedText style={[styles.matchup, { color: palette.textMuted }]}> vs </ThemedText>
          <ThemedText style={[styles.matchup, { color: opponentColor }]}>
            {liveScore.opponentName}
          </ThemedText>
        </ThemedText>
        <ThemedText style={[styles.pointText, { color: palette.textMuted }]}>
          Point {liveScore.pointNumber}
        </ThemedText>
      </View>

      <GameScore
        myScore={liveScore.myScore}
        opponentScore={liveScore.opponentScore}
        isScrimmage={liveScore.isScrimmage}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  // Matches SavedGameResultRow inside a SavedGamesList group so the live game reads as the top of the list.
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      borderRadius: 14,
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      minHeight: scaleBySizeClass(64, sizeClass),
    },
    pressed: {
      opacity: 0.7,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      borderRadius: 999,
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(2, sizeClass),
    },
    liveDot: {
      width: scaleBySizeClass(6, sizeClass),
      height: scaleBySizeClass(6, sizeClass),
      borderRadius: 999,
    },
    liveBadgeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.6,
    },
    details: {
      flex: 1,
      gap: 2,
    },
    matchup: {
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pointText: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}
