import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedInitialPullWinBucket } from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface OpeningPullSplitPanelProps {
  bucket: AdvancedInitialPullWinBucket;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  subtitle: string;
  accentColor: string;
}

function formatRecord(bucket: AdvancedInitialPullWinBucket) {
  if (bucket.games === 0) return 'No games';
  return `${bucket.wins}-${bucket.losses}`;
}

function formatGameCount(bucket: AdvancedInitialPullWinBucket) {
  if (bucket.games === 1) return '1 game';
  return `${bucket.games} games`;
}

export default function OpeningPullSplitPanel({
  bucket,
  iconName,
  label,
  subtitle,
  accentColor,
}: OpeningPullSplitPanelProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
      ]}>
      <View style={styles.panelHeader}>
        <View style={[styles.iconBadge, { backgroundColor: palette.accentOverlay10 }]}>
          <MaterialCommunityIcons
            name={iconName}
            size={scaleBySizeClass(18, sizeClass)}
            color={accentColor}
          />
        </View>
        <View style={styles.labelBlock}>
          <ThemedText style={[styles.panelLabel, { color: palette.textInverse }]}>
            {label}
          </ThemedText>
          <ThemedText style={[styles.panelSubtitle, { color: palette.textMuted }]}>
            {subtitle}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.record, { color: accentColor }]}>
        {formatRecord(bucket)}
      </ThemedText>
      <ThemedText style={[styles.gameCount, { color: palette.textMuted }]}>
        {formatGameCount(bucket)}
      </ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      minHeight: 122,
      justifyContent: 'space-between',
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    iconBadge: {
      width: scaleBySizeClass(32, sizeClass),
      height: scaleBySizeClass(32, sizeClass),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelBlock: {
      flex: 1,
    },
    panelLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
    },
    panelSubtitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
    },
    record: {
      fontSize: scaleBySizeClass(30, sizeClass),
      lineHeight: scaleBySizeClass(34, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    gameCount: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
    },
  });
}
