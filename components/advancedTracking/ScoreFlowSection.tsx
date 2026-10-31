import { StyleSheet, View } from 'react-native';

import ScoreFlowChart from '@/components/advancedTracking/ScoreFlowChart';
import ChartLegend, { type ChartLegendItem } from '@/components/view-stats/ChartLegend';
import ChartStatRow, { type ChartStat } from '@/components/view-stats/ChartStatRow';
import { useTheme } from '@/context/ThemeContext';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { computeScoreFlow } from '@/lib/advancedTracking/scoreFlowUtils';
import { pluralize } from '@/lib/utils';

interface ScoreFlowSectionProps {
  game: AnalyticsGame;
  perspectiveSideId: string;
}

/** How a single game's score unfolded: the margin chart and its key numbers. */
export default function ScoreFlowSection({ game, perspectiveSideId }: ScoreFlowSectionProps) {
  const { palette } = useTheme();

  const flow = computeScoreFlow(game, perspectiveSideId);
  if (flow.steps.length === 0) return null;

  // A zero says nothing the chart doesn't already show, so only stats with a value appear.
  const stats: ChartStat[] = [];
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
  const legend: ChartLegendItem[] = [];
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
      {hasLegend && <ChartLegend items={legend} swatch="dot" />}
      {hasStats && <ChartStatRow stats={stats} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 8,
  },
});
