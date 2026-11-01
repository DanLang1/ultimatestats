import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
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
  const lines = [
    { name: liveScore.myTeamName, score: liveScore.myScore },
    { name: liveScore.opponentName, score: liveScore.opponentScore },
  ];

  return (
    <Pressable
      testID="stats-live-game"
      accessibilityRole="button"
      accessibilityLabel="Open live game stats"
      onPress={() => router.push('/live-stats')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.overlay05 },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={[styles.liveBadge, { backgroundColor: palette.dangerOverlay15 }]}>
          <View style={[styles.liveDot, { backgroundColor: palette.danger }]} />
          <ThemedText style={[styles.liveBadgeText, { color: palette.danger }]}>LIVE</ThemedText>
        </View>
        <ThemedText style={[styles.pointText, { color: palette.textMuted }]}>
          Point {liveScore.pointNumber}
        </ThemedText>
      </View>
      <View style={styles.scoreLines}>
        {lines.map((line, index) => (
          <View key={index} style={styles.scoreLine}>
            <ThemedText style={[styles.teamName, { color: palette.textInverse }]} numberOfLines={1}>
              {line.name}
            </ThemedText>
            <ThemedText style={[styles.score, { color: palette.textInverse }]}>
              {line.score}
            </ThemedText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  // Matches the saved game cards in SavedGamesList so the live game reads as the top of the list.
  const rowInset = scaleBySizeClass(10, sizeClass);
  return StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(6, sizeClass),
    },
    pressed: {
      opacity: 0.7,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: rowInset,
      paddingTop: scaleBySizeClass(4, sizeClass),
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
    pointText: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    scoreLines: {
      gap: 2,
    },
    scoreLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: rowInset,
      paddingVertical: scaleBySizeClass(8, sizeClass),
    },
    teamName: {
      flex: 1,
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    score: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
      minWidth: 28,
      textAlign: 'right',
    },
  });
}
