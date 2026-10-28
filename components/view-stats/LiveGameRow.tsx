import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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

  return (
    <Pressable
      testID="stats-live-game"
      accessibilityRole="button"
      accessibilityLabel="Open live game stats"
      onPress={() => router.push('/live-stats')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.overlay05, borderColor: palette.accentOverlay30 },
        pressed && styles.pressed,
      ]}>
      <View style={styles.content}>
        <View style={[styles.liveBadge, { backgroundColor: palette.dangerOverlay15 }]}>
          <View style={[styles.liveDot, { backgroundColor: palette.danger }]} />
          <ThemedText style={[styles.liveBadgeText, { color: palette.danger }]}>LIVE</ThemedText>
        </View>
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
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(20, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      borderRadius: 12,
      borderWidth: 1,
      padding: scaleBySizeClass(14, sizeClass),
    },
    pressed: {
      opacity: 0.7,
    },
    content: {
      flex: 1,
      gap: scaleBySizeClass(6, sizeClass),
    },
    liveBadge: {
      alignSelf: 'flex-start',
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
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.6,
    },
    scoreLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamName: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    score: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
      minWidth: scaleBySizeClass(28, sizeClass),
      textAlign: 'right',
    },
  });
}
