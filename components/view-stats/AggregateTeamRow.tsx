import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatRecentDay } from '@/lib/dateUtils';
import { AggregateTeam, formatRecord } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface AggregateTeamRowProps {
  team: AggregateTeam;
  showDivider: boolean;
  onPress: () => void;
}

/** One team in the aggregate team list: name, game count and last played day, and record. */
export default function AggregateTeamRow({ team, showDivider, onPress }: AggregateTeamRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const gameCount = `${team.games.length} ${team.games.length === 1 ? 'game' : 'games'}`;
  const lastPlayed = formatRecentDay(team.games[0].timestamp);
  const record = formatRecord(team.games);
  const accessibilityLabel = [
    team.name,
    gameCount,
    record != null ? `record ${record}` : null,
    `last played ${lastPlayed}`,
  ]
    .filter((part) => part != null)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: palette.overlay08, borderBottomWidth: 1 },
        pressed && { backgroundColor: palette.overlay05 },
      ]}>
      <View style={styles.details}>
        <ThemedText style={[styles.name, { color: palette.textInverse }]} numberOfLines={1}>
          {team.name}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: palette.textMuted }]} numberOfLines={1}>
          {`${gameCount} · last ${lastPlayed}`}
        </ThemedText>
      </View>
      {record != null && (
        <ThemedText style={[styles.record, { color: palette.textInverse }]}>{record}</ThemedText>
      )}
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(22, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingLeft: scaleBySizeClass(14, sizeClass),
      paddingRight: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      minHeight: scaleBySizeClass(64, sizeClass),
    },
    details: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    meta: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    record: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
  });
}
