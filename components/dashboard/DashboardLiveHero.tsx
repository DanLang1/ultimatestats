import { StyleSheet, View } from 'react-native';

import DashboardPrimaryButton from '@/components/dashboard/DashboardPrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLiveGameScore } from '@/hooks/useLiveGameScore';
import { formatScoreAccessibilityLabel } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface DashboardLiveHeroProps {
  onResume: () => void;
}

/** With a game in progress: its live score and the screen's one primary action, Resume. */
export default function DashboardLiveHero({ onResume }: DashboardLiveHeroProps) {
  const liveScore = useLiveGameScore();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const opponentNameColor = liveScore.isScrimmage ? palette.textInverse : palette.textMuted;

  return (
    <View
      testID="dashboard-live-game"
      style={[styles.card, { backgroundColor: palette.overlay05 }]}>
      <View style={styles.statusRow}>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, { backgroundColor: palette.danger }]} />
          <ThemedText style={[styles.liveText, { color: palette.danger }]}>LIVE</ThemedText>
        </View>
        <ThemedText style={[styles.pointText, { color: palette.textMuted }]}>
          Point {liveScore.pointNumber}
        </ThemedText>
      </View>

      <View style={styles.matchupRow}>
        <View style={styles.matchup}>
          <ThemedText style={[styles.teamName, { color: palette.textInverse }]} numberOfLines={2}>
            {liveScore.myTeamName}
          </ThemedText>
          <ThemedText style={[styles.opponentLine, { color: palette.textMuted }]} numberOfLines={1}>
            {'vs '}
            <ThemedText style={[styles.opponentLine, { color: opponentNameColor }]}>
              {liveScore.opponentName}
            </ThemedText>
          </ThemedText>
        </View>
        <GameScore
          myScore={liveScore.myScore}
          opponentScore={liveScore.opponentScore}
          isScrimmage={liveScore.isScrimmage}
          style={styles.score}
          accessibilityLabel={formatScoreAccessibilityLabel(liveScore)}
        />
      </View>

      <View style={styles.actions}>
        <DashboardPrimaryButton
          testID="dashboard-resume-game-button"
          label="Resume game"
          onPress={onResume}
        />
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      padding: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    liveDot: {
      width: scaleBySizeClass(8, sizeClass),
      height: scaleBySizeClass(8, sizeClass),
      borderRadius: 999,
    },
    liveText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    pointText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    matchupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
    },
    matchup: {
      flex: 1,
      gap: 2,
    },
    teamName: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(28, sizeClass),
    },
    opponentLine: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    score: {
      fontSize: scaleBySizeClass(34, sizeClass),
      lineHeight: scaleBySizeClass(40, sizeClass),
    },
    actions: {
      marginTop: scaleBySizeClass(4, sizeClass),
    },
  });
}
