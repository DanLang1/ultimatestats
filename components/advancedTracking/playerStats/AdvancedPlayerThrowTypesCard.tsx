import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { hasAnyThrowTypeStat } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { Fonts } from '@/theme/theme';

type AdvancedPlayerThrowTypesCardProps = {
  stats: AdvancedPlayerStats;
};

export default function AdvancedPlayerThrowTypesCard({ stats }: AdvancedPlayerThrowTypesCardProps) {
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (!hasAnyThrowTypeStat(stats)) return null;

  const huckCompletionPct = stats.huckAttempts > 0 ? stats.huckCompletionPct : null;

  const handleInfoPress = () => {
    showAlert({
      title: 'Throw Classifications',
      message: 'Classifications are optional, so this data may not be fully accurate.',
    });
  };

  const renderRow = (label: string, value: number | string) => (
    <View key={label} style={[styles.row, { borderBottomColor: palette.overlay10 }]}>
      <ThemedText style={[styles.rowLabel, { color: palette.textMuted }]}>{label}</ThemedText>
      <ThemedText style={[styles.rowValue, { color: palette.textInverse }]}>{value}</ThemedText>
    </View>
  );

  return (
    <View
      testID="advanced-player-throw-types-card"
      style={[styles.card, { backgroundColor: palette.overlay02, borderColor: palette.overlay05 }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: palette.textMuted }]}>THROW TYPES</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="About throw classifications"
          hitSlop={8}
          onPress={handleInfoPress}>
          <MaterialCommunityIcons
            name="information-outline"
            size={scaleBySizeClass(15, sizeClass)}
            color={palette.textMuted}
          />
        </Pressable>
      </View>

      {stats.huckAttempts > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            THROWING · HUCKS
          </ThemedText>
          {renderRow(
            'Huck completion',
            `${
              huckCompletionPct == null ? '-' : `${Math.round(huckCompletionPct * 100)}%`
            } · ${stats.huckCompletions}/${stats.huckAttempts}`,
          )}
          {stats.huckIncompletions > 0 && renderRow('Huck incompletions', stats.huckIncompletions)}
          {stats.huckThrowaways > 0 && renderRow('Huck throwaways', stats.huckThrowaways)}
          {stats.huckDrops > 0 && renderRow('Huck drop outcomes', stats.huckDrops)}
          {stats.huckBlocks > 0 && renderRow('Blocked hucks', stats.huckBlocks)}
          {stats.huckPressures > 0 && renderRow('Pressured hucks', stats.huckPressures)}
        </View>
      )}

      {stats.resetTurnovers > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            THROWING · BACKFIELD RESETS
          </ThemedText>
          {renderRow('Reset turnovers', stats.resetTurnovers)}
          {stats.resetThrowaways > 0 && renderRow('Reset throwaways', stats.resetThrowaways)}
          {stats.resetDrops > 0 && renderRow('Reset drop outcomes', stats.resetDrops)}
          {stats.resetBlocks > 0 && renderRow('Blocked resets', stats.resetBlocks)}
          {stats.resetPressures > 0 && renderRow('Pressured resets', stats.resetPressures)}
        </View>
      )}

      {(stats.hucksCaught > 0 || stats.hucksDropped > 0 || stats.resetsDropped > 0) && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            RECEIVING
          </ThemedText>
          {stats.hucksCaught > 0 && renderRow('Hucks caught', stats.hucksCaught)}
          {stats.hucksDropped > 0 && renderRow('Hucks dropped', stats.hucksDropped)}
          {stats.resetsDropped > 0 && renderRow('Resets dropped', stats.resetsDropped)}
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 12,
      minHeight: 250,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    title: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
    },
    section: {
      marginTop: 8,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 5,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    rowValue: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
