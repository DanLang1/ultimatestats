import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface PlayerSummaryCardProps {
  name: string;
  scope: string;
  plusMinus: number;
  stats: StatItem[];
  badges: string[];
  profile: ReactNode;
}

export default function PlayerSummaryCard({
  name,
  scope,
  plusMinus,
  stats,
  badges,
  profile,
}: PlayerSummaryCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  let impactColor = palette.textInverse;
  if (plusMinus > 0) impactColor = palette.success;
  else if (plusMinus < 0) impactColor = palette.danger;
  return (
    <StatsSectionCard title={name}>
      <View style={styles.content}>
        <ThemedText style={[styles.scope, { color: palette.textMuted }]}>{scope}</ThemedText>
        {badges.length > 0 && (
          <View style={styles.badges}>
            {badges.map((badge) => (
              <ThemedText key={badge} style={[styles.badge, { color: palette.accent }]}>
                {badge}
              </ThemedText>
            ))}
          </View>
        )}
        <View style={styles.heroRow}>
          <View style={styles.heroImpact}>
            <ThemedText style={[styles.impact, { color: impactColor }]}>
              {plusMinus > 0 ? `+${plusMinus}` : String(plusMinus)}
            </ThemedText>
            <ThemedText style={[styles.scope, { color: palette.textMuted }]}>Net impact</ThemedText>
          </View>
          <View style={styles.heroProfile}>{profile}</View>
        </View>
        <StatsGrid stats={stats} columns={3} variant="summary" />
      </View>
    </StatsSectionCard>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: { gap: 12 },
    scope: { fontSize: scaleBySizeClass(13, sizeClass), fontFamily: Fonts.semiBold },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    badge: { fontSize: scaleBySizeClass(13, sizeClass), fontFamily: Fonts.bold },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroImpact: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 2 },
    heroProfile: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
    impact: { fontSize: scaleBySizeClass(32, sizeClass), fontFamily: Fonts.extraBold },
  });
}
