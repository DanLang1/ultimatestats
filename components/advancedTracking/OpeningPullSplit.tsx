import OpeningPullSplitPanel from '@/components/advancedTracking/OpeningPullSplitPanel';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { AdvancedInitialPullWinStats } from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface OpeningPullSplitProps {
  stats: AdvancedInitialPullWinStats;
}

export default function OpeningPullSplit({ stats }: OpeningPullSplitProps) {
  const { palette } = useTheme();
  const { isLandscape } = useLayout();
  const styles = createStyles();

  return (
    <View style={styles.container}>
      <View style={[styles.panelRow, !isLandscape && styles.panelRowPortrait]}>
        <OpeningPullSplitPanel
          bucket={stats.receivingFirst}
          iconName="disc"
          label="Started on Offense"
          subtitle="Received first pull"
          accentColor={palette.success}
        />
        <OpeningPullSplitPanel
          bucket={stats.pullingFirst}
          iconName="shield-outline"
          label="Started on Defense"
          subtitle="Pulled first"
          accentColor={palette.accent}
        />
      </View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    panelRow: {
      flexDirection: 'row',
      gap: 8,
    },
    panelRowPortrait: {
      flexDirection: 'column',
    },
  });
}
