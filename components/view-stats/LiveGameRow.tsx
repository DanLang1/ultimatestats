import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getLiveInProgressGame,
  getOtherSideId,
  getSideScore,
} from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

type LiveScoreLine = { name: string; score: number };
type LiveScoreLines = [LiveScoreLine, LiveScoreLine];

/** The focus side first, then its opponent. */
function getAdvancedScoreLines(game: AdvancedTrackedGame): LiveScoreLines {
  const focusSide = game.sides.find((side) => side.id === game.focusSideId);
  const otherSideId = getOtherSideId(game, game.focusSideId);
  const otherSide = game.sides.find((side) => side.id === otherSideId);
  if (!focusSide || !otherSide) throw new Error('Live advanced game is missing a side.');
  return [
    { name: focusSide.label, score: getSideScore(game, focusSide.id) },
    { name: otherSide.label, score: getSideScore(game, otherSide.id) },
  ];
}

/** Pinned row for the game in progress; opens its live stats. */
export default function LiveGameRow() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const liveAdvancedGame = useAdvancedTrackingStore(getLiveInProgressGame);
  const basicTeam1Name = useGameStore((state) => state.currentTeam.name);
  const basicTeam2Name = useGameStore((state) => state.team2Name);
  const basicTeam1Score = useGameStore((state) => state.team1Score);
  const basicTeam2Score = useGameStore((state) => state.team2Score);

  const lines: LiveScoreLines = liveAdvancedGame
    ? getAdvancedScoreLines(liveAdvancedGame)
    : [
        { name: basicTeam1Name, score: basicTeam1Score },
        { name: basicTeam2Name, score: basicTeam2Score },
      ];

  // The point being played, or the next one between points.
  const pointNumber = lines[0].score + lines[1].score + 1;

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
          Point {pointNumber}
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
