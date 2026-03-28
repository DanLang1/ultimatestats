import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { fetchShowcaseList } from '@/lib/sharing';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import ShowcaseCard from '@/components/showcase/ShowcaseCard';

export default function ShowcaseScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const {
    data: games,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['showcaseGames'],
    queryFn: fetchShowcaseList,
  });

  function renderBody() {
    if (isPending) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.accent} />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(32, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            Could not load showcase games.
          </ThemedText>
        </View>
      );
    }

    if (!hasItems(games)) {
      return (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={scaleBySizeClass(32, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            No showcase games yet.
          </ThemedText>
        </View>
      );
    }

    return games.map((game) => <ShowcaseCard key={game.id} game={game} sizeClass={sizeClass} />);
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="SHOWCASE"
        onBack={() => router.back()}
        titleColor={palette.textInverse}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasItems(games) && (
          <ThemedText style={[styles.metaLine, { color: palette.textMuted }]}>
            {games!.length} {games!.length === 1 ? 'game' : 'games'} available
          </ThemedText>
        )}
        {renderBody()}
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
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingTop: scaleBySizeClass(80, sizeClass),
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      textAlign: 'center',
    },
    metaLine: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
