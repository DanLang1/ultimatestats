import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatRecord, GameListItem } from '@/lib/gameListUtils';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface CombinedGamesHeaderProps {
  myTeamName: string;
  games: GameListItem[];
}

/** Team and game count on one left edge with the combined record on the right. */
export default function CombinedGamesHeader({ myTeamName, games }: CombinedGamesHeaderProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  // The same record the team list and selection bar show.
  const record = formatRecord(games);
  const gameCountLabel = `${games.length} ${pluralize(games.length, 'game', 'games')}`;

  return (
    <View style={styles.row}>
      <View style={styles.matchup}>
        <ThemedText
          testID="advanced-stats-team-name"
          style={[styles.teamName, { color: palette.textInverse }]}
          numberOfLines={2}>
          {myTeamName}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
          {gameCountLabel}
        </ThemedText>
      </View>
      <ThemedText
        testID="advanced-stats-combined-record"
        accessibilityLabel={`Record ${record}`}
        style={[styles.record, { color: palette.textInverse }]}>
        {record}
      </ThemedText>
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
    subtitle: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    record: {
      fontSize: scaleBySizeClass(isLandscape ? 40 : 34, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(isLandscape ? 46 : 40, sizeClass),
      fontVariant: ['tabular-nums'],
    },
  });
}
