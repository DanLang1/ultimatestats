import { StyleSheet, View } from 'react-native';

import ScoreFlowChart from '@/components/advancedTracking/ScoreFlowChart';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { computeScoreFlow } from '@/lib/advancedTracking/scoreFlowUtils';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface ScoreFlowSectionProps {
  game: AnalyticsGame;
  perspectiveSideId: string;
}

/** How a single game's score unfolded: the margin chart and its key numbers. */
export default function ScoreFlowSection({ game, perspectiveSideId }: ScoreFlowSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const flow = computeScoreFlow(game, perspectiveSideId);
  if (flow.steps.length === 0) return null;

  // A zero says nothing the chart doesn't already show, so only stats with a value appear.
  const stats: { label: string; display: string }[] = [];
  if (flow.halftime) {
    const { myScore, opponentScore } = flow.halftime;
    stats.push({ label: 'Halftime', display: `${myScore}\u2009–\u2009${opponentScore}` });
  }
  if (flow.biggestLead > 0) {
    stats.push({ label: 'Biggest lead', display: `+${flow.biggestLead}` });
  }
  if (flow.leadChanges > 0) {
    stats.push({
      label: pluralize(flow.leadChanges, 'Lead change', 'Lead changes'),
      display: String(flow.leadChanges),
    });
  }
  const hasStats = stats.length > 0;

  // Scrimmages draw every break dot in the same neutral color, so one entry covers them.
  const isScrimmage = game.gameType === 'scrimmage';
  const hasBreaks = flow.steps.some((step) => step.outcome === 'break');
  const hasBrokens = flow.steps.some((step) => step.outcome === 'broken');
  const legend: { label: string; color: string }[] = [];
  if (isScrimmage && (hasBreaks || hasBrokens)) {
    legend.push({ label: 'Break', color: palette.textMuted });
  } else {
    if (hasBreaks) legend.push({ label: 'Break', color: palette.success });
    if (hasBrokens) legend.push({ label: 'Broken', color: palette.danger });
  }
  const hasLegend = legend.length > 0;
  return (
    <View testID="score-flow-section" style={styles.container}>
      <ScoreFlowChart
        steps={flow.steps}
        isNeutral={isScrimmage}
        accessibilityLabel="Score margin by point"
      />
      {hasLegend && (
        <View style={styles.legendRow}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <ThemedText style={[styles.legendLabel, { color: palette.textMuted }]}>
                {item.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
      {hasStats && (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <ThemedText style={[styles.statValue, { color: palette.textInverse }]}>
                {stat.display}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>
                {stat.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      marginTop: 16,
      gap: 8,
    },
    legendRow: {
      flexDirection: 'row',
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    legendLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: 12,
    },
    stat: {
      flex: 1,
    },
    statValue: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
