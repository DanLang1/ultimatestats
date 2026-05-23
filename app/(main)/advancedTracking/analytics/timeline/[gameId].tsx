import AdvancedEventTimeline from '@/components/advancedTracking/timeline/AdvancedEventTimeline';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { buildAdvancedTimeline } from '@/lib/advancedTracking/advancedTimelineUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function AdvancedGameTimelineScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { data: rawGame = null } = useAdvancedGame(gameId);

  if (!gameId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
            TIMELINE
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            Missing game link.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!rawGame) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
            TIMELINE
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            Game not found.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const timelinePoints = buildAdvancedTimeline(rawGame);

  const focusSideId = rawGame.focusSideId;
  const oppSideId = rawGame.sides.find((s) => s.id !== focusSideId)?.id ?? '';
  const sideLabels = Object.fromEntries(rawGame.sides.map((s) => [s.id, s.label]));
  const focusSideLabel = sideLabels[focusSideId] ?? 'My Team';
  const oppSideLabel = sideLabels[oppSideId] ?? 'Opponent';

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
          GAME TIMELINE
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.gameInfo}>
        <ThemedText style={[styles.teamNames, { color: palette.textInverse }]}>
          {focusSideLabel} vs {rawGame.metadata?.opponentName ?? oppSideLabel}
        </ThemedText>
      </View>

      {hasItems(timelinePoints) ? (
        <AdvancedEventTimeline
          points={timelinePoints}
          focusSideId={focusSideId}
          oppSideId={oppSideId}
          sideLabels={sideLabels}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="timeline-outline"
            size={scaleBySizeClass(48, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            No points to display
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(2, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    headerSpacer: {
      width: scaleBySizeClass(40, sizeClass),
    },
    gameInfo: {
      alignItems: 'center',
      paddingBottom: 16,
      gap: 4,
    },
    teamNames: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
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
  });
}
