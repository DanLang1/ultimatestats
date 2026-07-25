import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type {
  AdvancedFlipChoiceBucket,
  AdvancedFlipStats,
  AdvancedInitialPullWinBucket,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { Fonts } from '@/theme/theme';

interface OpeningSetupStatsProps {
  flipStats?: AdvancedFlipStats;
  initialPullWinStats?: AdvancedInitialPullWinStats;
}

function formatWinRate(winPercentage: number | null): string {
  if (winPercentage === null) return '—';
  return `${Math.round(winPercentage * 100)}%`;
}

function formatRecord(bucket: AdvancedInitialPullWinBucket | AdvancedFlipChoiceBucket): string {
  const ties = 'ties' in bucket ? bucket.ties : 0;
  if (ties > 0) return `${bucket.wins}-${bucket.losses}-${ties}`;
  return `${bucket.wins}-${bucket.losses}`;
}

function formatGameCount(games: number): string {
  return `${games} ${games === 1 ? 'game' : 'games'}`;
}

export default function OpeningSetupStats({
  flipStats,
  initialPullWinStats,
}: OpeningSetupStatsProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const startingRows = [
    {
      key: 'offense',
      label: 'Started on Offense',
      choiceLabel: 'We chose offense',
      accentColor: palette.success,
      bucket: initialPullWinStats?.receivingFirst,
      choiceBucket: flipStats?.byChoice.offense,
    },
    {
      key: 'defense',
      label: 'Started on Defense',
      choiceLabel: 'We chose defense',
      accentColor: palette.accent,
      bucket: initialPullWinStats?.pullingFirst,
      choiceBucket: flipStats?.byChoice.defense,
    },
  ].filter((row) => row.bucket != null && row.bucket.games > 0);

  const sideChoice = flipStats?.byChoice.side;

  return (
    <View
      style={[styles.card, { backgroundColor: palette.overlay05, borderColor: palette.overlay10 }]}>
      {flipStats && (
        <View style={styles.flipRow}>
          <View>
            <ThemedText style={[styles.rowLabel, { color: palette.textInverse }]}>
              Flips Won
            </ThemedText>
            <ThemedText style={[styles.rowDetail, { color: palette.textMuted }]}>
              {flipStats.wins} of {flipStats.recorded} recorded
            </ThemedText>
          </View>
          <ThemedText style={[styles.flipRate, { color: palette.textInverse }]}>
            {formatWinRate(flipStats.winPercentage)}
          </ThemedText>
        </View>
      )}

      {flipStats && startingRows.length > 0 && (
        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
      )}

      {startingRows.length > 0 && (
        <View style={styles.startingRows}>
          {startingRows.map((row) => {
            const bucket = row.bucket;
            if (bucket == null) return null;

            const choiceBucket = row.choiceBucket;
            const hasChoice = choiceBucket != null && choiceBucket.games > 0;

            return (
              <View key={row.key} style={styles.startingRow}>
                <View style={styles.startingHeader}>
                  <ThemedText style={[styles.rowLabel, { color: palette.textInverse }]}>
                    {row.label}
                  </ThemedText>
                  <ThemedText style={[styles.gameCount, { color: palette.textMuted }]}>
                    {formatGameCount(bucket.games)}
                  </ThemedText>
                </View>

                <View style={styles.outcomeRow}>
                  <ThemedText style={[styles.outcomeRate, { color: row.accentColor }]}>
                    {formatWinRate(bucket.winPercentage)}
                  </ThemedText>
                  <ThemedText style={[styles.outcomeDetail, { color: palette.textSecondary }]}>
                    {formatRecord(bucket)} record
                  </ThemedText>
                </View>

                {hasChoice && (
                  <View style={[styles.choiceRow, { backgroundColor: palette.overlay08 }]}>
                    <ThemedText style={[styles.choiceLabel, { color: palette.textMuted }]}>
                      {row.choiceLabel}
                    </ThemedText>
                    <ThemedText style={[styles.choiceDetail, { color: palette.textInverse }]}>
                      {formatRecord(choiceBucket)} · {formatWinRate(choiceBucket.winPercentage)}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {sideChoice && sideChoice.games > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
          <View style={styles.sideChoiceRow}>
            <ThemedText style={[styles.choiceLabel, { color: palette.textMuted }]}>
              We chose side
            </ThemedText>
            <ThemedText style={[styles.choiceDetail, { color: palette.textInverse }]}>
              {formatRecord(sideChoice)} · {formatWinRate(sideChoice.winPercentage)}
            </ThemedText>
          </View>
        </>
      )}
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    flipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    flipRate: {
      fontSize: scaleBySizeClass(26, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(30, sizeClass),
    },
    divider: {
      height: 1,
    },
    startingRows: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: 12,
    },
    startingRow: {
      flex: 1,
      gap: 8,
    },
    startingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    rowDetail: {
      fontSize: scaleBySizeClass(10, sizeClass),
      marginTop: 2,
    },
    gameCount: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
    },
    outcomeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    outcomeRate: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(26, sizeClass),
    },
    outcomeDetail: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    choiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    sideChoiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    choiceLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.4, sizeClass, { rounding: 'none' }),
    },
    choiceDetail: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'right',
    },
  });
}
