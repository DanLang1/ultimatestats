import { StyleSheet, View } from 'react-native';

import GameMarginsChart from '@/components/advancedTracking/GameMarginsChart';
import ChartStatRow, { type ChartStat } from '@/components/view-stats/ChartStatRow';
import {
  formatPointDifferential,
  GameListItem,
  getMarginsOldestFirst,
  getPointTotals,
} from '@/lib/gameListUtils';

interface GameMarginsSectionProps {
  games: GameListItem[];
}

/** How a set of games went: each game's final margin, then the combined point totals. */
export default function GameMarginsSection({ games }: GameMarginsSectionProps) {
  const margins = getMarginsOldestFirst(games);
  if (margins.length === 0) return null;

  const { pointsFor, pointsAgainst } = getPointTotals(games);
  const stats: ChartStat[] = [
    { label: 'Point diff', display: formatPointDifferential(games) },
    { label: 'Points', display: `${pointsFor}\u2009–\u2009${pointsAgainst}` },
  ];

  const chartLabel = `Final margin by game, oldest first: ${margins.map(formatMargin).join(', ')}`;

  return (
    <View testID="game-margins-section" style={styles.container}>
      <GameMarginsChart margins={margins} accessibilityLabel={chartLabel} />
      <ChartStatRow stats={stats} />
    </View>
  );
}

function formatMargin(margin: number): string {
  return margin > 0 ? `+${margin}` : String(margin);
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 8,
  },
});
