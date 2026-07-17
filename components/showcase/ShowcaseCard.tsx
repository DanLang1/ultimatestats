import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  fetchShowcasePayload,
  incrementShowcaseImportCount,
  ShowcaseGameMeta,
} from '@/lib/sharing';
import { hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

interface ShowcaseCardProps {
  game: ShowcaseGameMeta;
}

export default function ShowcaseCard({ game }: ShowcaseCardProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const { importGame } = useGameStore();
  const { importAdvancedGame } = useAdvancedTrackingStore();

  const { savedGames } = useGameStore();
  const { data: advancedSummaries } = useAdvancedGameSummaries();
  const basicGameImported =
    game.game_type === 'game' && savedGames.some((savedGame) => savedGame.id === game.game_id);
  const advancedGameImported =
    game.game_type === 'advanced-game' &&
    advancedSummaries.some((summary) => summary.id === game.game_id);
  const alreadyImported = basicGameImported || advancedGameImported;

  const {
    mutate,
    isPending,
    isSuccess,
    isError,
    data: importedGameId,
  } = useMutation({
    mutationFn: async () => {
      const payload = await fetchShowcasePayload(game.id);
      if (payload.type === 'advanced-game') {
        const importedGame = { ...payload.data, importedAt: Date.now() };
        await importAdvancedGame(importedGame);
        incrementShowcaseImportCount(game.id);
        return { id: importedGame.id, type: payload.type };
      }

      const importedGame = { ...payload.data, importedAt: Date.now() };
      await importGame(importedGame);
      incrementShowcaseImportCount(game.id);
      return { id: importedGame.id, type: payload.type };
    },
  });

  const viewGameId = importedGameId?.id ?? (alreadyImported ? game.game_id : null);
  const viewGameType = importedGameId?.type ?? game.game_type;
  const showViewGame = isSuccess || alreadyImported;
  const importCountLabel = `${game.import_count} ${game.import_count === 1 ? 'import' : 'imports'}`;

  function renderButtonContent() {
    if (isPending) {
      return <ActivityIndicator size="small" color={palette.textOnAccent} />;
    }
    if (showViewGame) {
      return (
        <>
          <MaterialCommunityIcons
            name="open-in-new"
            size={scaleBySizeClass(16, sizeClass)}
            color={palette.textInverse}
          />
          <ThemedText style={[styles.buttonText, { color: palette.textInverse }]}>
            View Game
          </ThemedText>
        </>
      );
    }
    return (
      <>
        <MaterialCommunityIcons
          name="download-outline"
          size={scaleBySizeClass(16, sizeClass)}
          color={palette.textOnAccent}
        />
        <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>Import</ThemedText>
      </>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.overlay05,
          borderColor: showViewGame ? palette.accentOverlay30 : palette.overlay15,
        },
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText numberOfLines={2} style={[styles.title, { color: palette.textInverse }]}>
          {game.title}
        </ThemedText>

        {game.import_count > 0 && (
          <View style={[styles.importBadge, { backgroundColor: palette.accentOverlay10 }]}>
            <MaterialCommunityIcons
              name="download-outline"
              size={scaleBySizeClass(11, sizeClass)}
              color={palette.accent}
            />
            <ThemedText style={[styles.importCount, { color: palette.accent }]}>
              {importCountLabel}
            </ThemedText>
          </View>
        )}
      </View>

      {game.description !== null && (
        <ThemedText style={[styles.description, { color: palette.textMuted }]}>
          {game.description}
        </ThemedText>
      )}

      {hasItems(game.tags) && (
        <View style={styles.tagsRow}>
          {game.tags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.tag,
                { backgroundColor: palette.accentOverlay10, borderColor: palette.accentOverlay30 },
              ]}>
              <ThemedText style={[styles.tagText, { color: palette.accent }]}>{tag}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {isError && (
        <ThemedText style={[styles.errorText, { color: palette.danger }]}>
          Failed to import. Please try again.
        </ThemedText>
      )}

      <Pressable
        onPress={() => {
          if (showViewGame && viewGameId) {
            if (viewGameType === 'advanced-game') {
              router.push({
                pathname: '/advancedTracking/analytics/[gameId]',
                params: { gameId: viewGameId },
              });
              return;
            }
            router.push({ pathname: '/saved-games/[gameId]', params: { gameId: viewGameId } });
            return;
          }
          mutate();
        }}
        disabled={isPending}
        style={({ pressed }) => [
          styles.button,
          showViewGame
            ? {
                backgroundColor: palette.accentOverlay10,
                borderColor: palette.accentOverlay30,
              }
            : {
                backgroundColor: palette.accent,
                borderColor: palette.accent,
              },
          (pressed || isPending) && styles.buttonPressed,
        ]}>
        {renderButtonContent()}
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: scaleBySizeClass(14, sizeClass),
      borderWidth: 1,
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(10, sizeClass),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: scaleBySizeClass(10, sizeClass),
    },
    title: {
      flex: 1,
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
      lineHeight: scaleBySizeClass(23, sizeClass),
    },
    importBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
      borderRadius: scaleBySizeClass(999, sizeClass),
    },
    importCount: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.2,
    },
    description: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(6, sizeClass),
    },
    tag: {
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
      borderRadius: scaleBySizeClass(999, sizeClass),
      borderWidth: 1,
    },
    tagText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.3,
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
