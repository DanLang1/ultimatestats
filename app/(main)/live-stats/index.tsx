import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import LiveGameStats from '@/components/view-stats/LiveGameStats';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function LiveStatsScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const liveAdvancedGame = useAdvancedTrackingStore(getLiveInProgressGame);

  const handleOpenTimeline = () => {
    if (liveAdvancedGame) {
      router.push({
        pathname: '/live-stats/advanced-timeline/[gameId]',
        params: { gameId: liveAdvancedGame.id },
      });
      return;
    }

    router.push('/live-stats/timeline');
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'timeline',
      label: 'Timeline',
      onPress: handleOpenTimeline,
      inlineIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.accent}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      ),
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="CURRENT GAME"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LiveGameStats />
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
      gap: scaleBySizeClass(16, sizeClass),
    },
  });
}
