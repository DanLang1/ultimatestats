import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import CombinedStatsView from '@/components/view-stats/CombinedStatsView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameKind } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

function isGameKind(value: string | undefined): value is GameKind {
  return value === 'basic' || value === 'advanced';
}

/**
 * Combined stats for one team's games of one kind; `gameIds` is comma-separated and
 * `excludedScrimmageCount` counts the selected scrimmages left out.
 */
export default function CombinedStatsScreen() {
  const {
    kind,
    gameIds,
    excludedScrimmageCount: excludedScrimmageCountParam,
  } = useLocalSearchParams<{
    kind?: string;
    gameIds?: string;
    excludedScrimmageCount?: string;
  }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const combinedGameIds = gameIds ? gameIds.split(',') : [];
  const excludedScrimmageCount = Number(excludedScrimmageCountParam);
  const hasValidLink =
    isGameKind(kind) &&
    combinedGameIds.length > 0 &&
    Number.isInteger(excludedScrimmageCount) &&
    excludedScrimmageCount >= 0;

  if (hasValidLink) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CombinedStatsView
          kind={kind}
          gameIds={combinedGameIds}
          excludedScrimmageCount={excludedScrimmageCount}
        />
      </>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="COMBINED STATS"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
      />
      <View style={styles.centeredState}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={scaleBySizeClass(42, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
          Missing games link.
        </ThemedText>
        <Pressable
          onPress={() => router.dismissTo('/stats')}
          style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
          <ThemedText style={[styles.recoverButtonText, { color: palette.accent }]}>
            Go to Saved Games
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    stateText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      textAlign: 'center',
      fontFamily: Fonts.semiBold,
    },
    recoverButton: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    recoverButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
