import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatScoreAccessibilityLabel } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedGameScoreHeaderProps {
  myTeamName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  /** Scrimmages have no side to credit, so both names stay full weight and the score neutral. */
  isScrimmage: boolean;
}

/** Matchup on one left edge with the final score on the right, our score in the result color. */
export default function AdvancedGameScoreHeader({
  myTeamName,
  opponentName,
  myScore,
  opponentScore,
  isScrimmage,
}: AdvancedGameScoreHeaderProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const opponentNameColor = isScrimmage ? palette.textInverse : palette.textMuted;
  // On the score rather than the row, so the names stay separate elements for Maestro.
  const scoreAccessibilityLabel = formatScoreAccessibilityLabel({
    myTeamName,
    opponentName,
    myScore,
    opponentScore,
  });

  return (
    <View style={styles.row}>
      <View style={styles.matchup}>
        <ThemedText
          testID="advanced-stats-team-name"
          style={[styles.teamName, { color: palette.textInverse }]}
          numberOfLines={2}>
          {myTeamName}
        </ThemedText>
        <ThemedText style={[styles.opponentLine, { color: palette.textMuted }]} numberOfLines={1}>
          {'vs '}
          <ThemedText
            testID="advanced-stats-opponent-name"
            style={[styles.opponentLine, { color: opponentNameColor }]}>
            {opponentName}
          </ThemedText>
        </ThemedText>
      </View>
      <GameScore
        testID="advanced-stats-score"
        myScore={myScore}
        opponentScore={opponentScore}
        isScrimmage={isScrimmage}
        style={styles.score}
        accessibilityLabel={scoreAccessibilityLabel}
      />
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    matchup: {
      flex: 1,
      gap: 2,
    },
    teamName: {
      fontSize: scaleBySizeClass(isLandscape ? 24 : 20, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(isLandscape ? 30 : 26, sizeClass),
    },
    opponentLine: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    score: {
      fontSize: scaleBySizeClass(isLandscape ? 40 : 34, sizeClass),
      lineHeight: scaleBySizeClass(isLandscape ? 46 : 40, sizeClass),
    },
  });
}
