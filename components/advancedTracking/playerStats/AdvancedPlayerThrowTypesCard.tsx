import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { hasAnyThrowTypeStat } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { Fonts } from '@/theme/theme';

type AdvancedPlayerThrowTypesCardProps = {
  stats: AdvancedPlayerStats;
};

type OutcomeItem = { key: string; text: string; isDanger?: boolean };

export default function AdvancedPlayerThrowTypesCard({ stats }: AdvancedPlayerThrowTypesCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (!hasAnyThrowTypeStat(stats)) return null;

  const huckTargetTotal = stats.hucksCaught + stats.hucksDropped;

  const renderOutcomes = (items: OutcomeItem[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.outcomesRow}>
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {index > 0 && (
              <ThemedText style={[styles.outcomeDot, { color: palette.textMuted }]}>·</ThemedText>
            )}
            <ThemedText
              style={[
                styles.outcomeText,
                { color: item.isDanger ? palette.danger : palette.textInverse },
              ]}>
              {item.text}
            </ThemedText>
          </React.Fragment>
        ))}
      </View>
    );
  };

  const getRateColor = (pct: number) => {
    if (pct >= 0.7) return palette.success;
    if (pct >= 0.4) return palette.accent;
    return palette.danger;
  };

  const hasHuckThrowing = stats.huckAttempts > 0;
  const hasHuckReceiving = huckTargetTotal > 0;
  const hasResetTurnovers = stats.resetTurnovers > 0 || stats.resetsDropped > 0;

  // Build Huck Throwing outcome tokens
  const huckOutcomeItems: OutcomeItem[] = [];
  if (stats.huckCompletions > 0) {
    huckOutcomeItems.push({
      key: 'completed',
      text: `${stats.huckCompletions} completed`,
    });
  }
  if (stats.huckThrowaways > 0) {
    huckOutcomeItems.push({
      key: 'throwaway',
      text: `${stats.huckThrowaways} ${stats.huckThrowaways === 1 ? 'throwaway' : 'throwaways'}`,
      isDanger: true,
    });
  }
  if (stats.huckBlocks > 0) {
    huckOutcomeItems.push({ key: 'blocked', text: `${stats.huckBlocks} blocked`, isDanger: true });
  }
  if (stats.huckDrops > 0) {
    huckOutcomeItems.push({
      key: 'dropped',
      text: `${stats.huckDrops} dropped`,
      isDanger: true,
    });
  }
  if (stats.huckPressures > 0) {
    huckOutcomeItems.push({
      key: 'pressured',
      text: `${stats.huckPressures} pressured`,
      isDanger: true,
    });
  }

  // Build Huck Receiving outcome tokens
  const huckReceivingItems: OutcomeItem[] = [];
  if (stats.hucksCaught > 0) {
    huckReceivingItems.push({
      key: 'caught',
      text: `${stats.hucksCaught} ${stats.hucksCaught === 1 ? 'huck caught' : 'hucks caught'}`,
    });
  }
  if (stats.hucksDropped > 0) {
    huckReceivingItems.push({
      key: 'dropped',
      text: `${stats.hucksDropped} ${stats.hucksDropped === 1 ? 'huck dropped' : 'hucks dropped'}`,
      isDanger: true,
    });
  }

  // Build Reset turnover tokens (combines thrown reset errors & caught reset drops)
  const resetOutcomeItems: OutcomeItem[] = [];
  if (stats.resetThrowaways > 0) {
    resetOutcomeItems.push({
      key: 'throwaway',
      text: `${stats.resetThrowaways} ${stats.resetThrowaways === 1 ? 'throwaway' : 'throwaways'}`,
      isDanger: true,
    });
  }
  if (stats.resetBlocks > 0) {
    resetOutcomeItems.push({
      key: 'blocked',
      text: `${stats.resetBlocks} blocked`,
      isDanger: true,
    });
  }
  if (stats.resetDrops > 0) {
    resetOutcomeItems.push({
      key: 'dropped',
      text: stats.resetDrops === 1 ? 'dropped throw' : `${stats.resetDrops} dropped throws`,
      isDanger: true,
    });
  }
  if (stats.resetPressures > 0) {
    resetOutcomeItems.push({
      key: 'pressured',
      text: `${stats.resetPressures} pressured`,
      isDanger: true,
    });
  }
  if (stats.resetsDropped > 0) {
    resetOutcomeItems.push({
      key: 'reset-dropped',
      text: `${stats.resetsDropped} ${stats.resetsDropped === 1 ? 'reset dropped' : 'resets dropped'}`,
      isDanger: true,
    });
  }

  const renderHuckThrowing = () => {
    if (!hasHuckThrowing) return null;

    const huckCompletionPct = stats.huckCompletionPct;
    if (huckCompletionPct == null) return null;

    const huckPctDisplay = `${Math.round(huckCompletionPct * 100)}%`;

    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
          HUCK THROWING
        </ThemedText>

        {/* Horizontal Stat Pair: Rate (Left) & Count (Right) */}
        <View style={styles.statHeroRow}>
          <View style={styles.statColLeft}>
            <ThemedText style={[styles.rateValue, { color: getRateColor(huckCompletionPct) }]}>
              {huckPctDisplay}
            </ThemedText>
            <ThemedText style={[styles.rateSublabel, { color: palette.textMuted }]}>
              Completion rate
            </ThemedText>
          </View>

          <View style={styles.statColRight}>
            <ThemedText style={[styles.fractionValue, { color: palette.textInverse }]}>
              {stats.huckCompletions} of {stats.huckAttempts}
            </ThemedText>
            <ThemedText style={[styles.fractionSublabel, { color: palette.textMuted }]}>
              Completions
            </ThemedText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: palette.overlay10 }]}>
          {huckCompletionPct > 0 && (
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${huckCompletionPct * 100}%`,
                  backgroundColor: getRateColor(huckCompletionPct),
                },
              ]}
            />
          )}
        </View>

        {/* Outcomes inline text */}
        {renderOutcomes(huckOutcomeItems)}
      </View>
    );
  };

  const renderHuckReceiving = () => {
    if (!hasHuckReceiving) return null;

    const huckCatchPct = stats.hucksCaught / huckTargetTotal;
    const huckCatchPctDisplay = `${Math.round(huckCatchPct * 100)}%`;

    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
          HUCK RECEIVING
        </ThemedText>

        {/* Horizontal Stat Pair: Catch Rate (Left) & Caught Count (Right) */}
        <View style={styles.statHeroRow}>
          <View style={styles.statColLeft}>
            <ThemedText style={[styles.rateValue, { color: getRateColor(huckCatchPct) }]}>
              {huckCatchPctDisplay}
            </ThemedText>
            <ThemedText style={[styles.rateSublabel, { color: palette.textMuted }]}>
              Catch rate
            </ThemedText>
          </View>

          <View style={styles.statColRight}>
            <ThemedText style={[styles.fractionValue, { color: palette.textInverse }]}>
              {stats.hucksCaught} of {huckTargetTotal}
            </ThemedText>
            <ThemedText style={[styles.fractionSublabel, { color: palette.textMuted }]}>
              Hucks caught
            </ThemedText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: palette.overlay10 }]}>
          {huckCatchPct > 0 && (
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${huckCatchPct * 100}%`,
                  backgroundColor: getRateColor(huckCatchPct),
                },
              ]}
            />
          )}
        </View>

        {/* Receiving outcomes */}
        {renderOutcomes(huckReceivingItems)}
      </View>
    );
  };

  return (
    <StatsSectionCard
      title="Throw classifications"
      testID="advanced-player-throw-types-card"
      info={{
        accessibilityLabel: 'About throw classifications',
        title: 'Throw Classifications',
        message: 'Classifications are optional, so this data may not be fully accurate.',
      }}>
      <View style={styles.content}>
        {/* Section 1: Huck Throwing */}
        {renderHuckThrowing()}

        {/* Divider between Huck Throwing and Huck Receiving */}
        {hasHuckThrowing && hasHuckReceiving && (
          <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        )}

        {/* Section 2: Huck Receiving */}
        {renderHuckReceiving()}

        {/* Divider before Reset Turnovers if previous sections exist */}
        {(hasHuckThrowing || hasHuckReceiving) && hasResetTurnovers && (
          <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
        )}

        {/* Section 3: Reset Turnovers */}
        {hasResetTurnovers && (
          <View style={styles.section}>
            <View style={styles.resetHeaderRow}>
              <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
                RESET TURNOVERS
              </ThemedText>

              {renderOutcomes(resetOutcomeItems)}
            </View>
          </View>
        )}
      </View>
    </StatsSectionCard>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: { gap: 16 },
    section: {
      gap: 4,
    },
    resetHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statHeroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 2,
    },
    statColLeft: {
      alignItems: 'flex-start',
    },
    statColRight: {
      alignItems: 'flex-end',
    },
    rateValue: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    rateSublabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
      marginBottom: 6,
    },
    fractionValue: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    fractionSublabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
      marginBottom: 6,
      textAlign: 'right',
    },
    progressBarTrack: {
      height: scaleBySizeClass(5, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    outcomesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    outcomeText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    outcomeDot: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 4,
    },
  });
}
