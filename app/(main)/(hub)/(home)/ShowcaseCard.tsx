import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import {
  fetchShowcasePayload,
  incrementShowcaseImportCount,
  ShowcaseGameMeta,
} from '@/lib/sharing';
import { useGameStore } from '@/store/gameStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

interface ShowcaseCardProps {
  game: ShowcaseGameMeta;
  sizeClass: SizeClass;
}

export default function ShowcaseCard({ game, sizeClass }: ShowcaseCardProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const { importGame } = useGameStore();

  const { savedGames } = useGameStore();
  const alreadyImported = savedGames.some((g) => g.id === game.game_id);

  const {
    mutate,
    isPending,
    isSuccess,
    isError,
    data: importedGameId,
  } = useMutation({
    mutationFn: async () => {
      const payload = await fetchShowcasePayload(game.id);
      const importedGame = { ...payload.data, importedAt: Date.now() };
      await importGame(importedGame);
      incrementShowcaseImportCount(game.id);
      return importedGame.id;
    },
  });

  const viewGameId = importedGameId ?? (alreadyImported ? game.game_id : null);
  const showViewGame = isSuccess || alreadyImported;

  return (
    <View style={[styles.card, { backgroundColor: palette.overlay08 }]}>
      <View style={styles.cardContent}>
        <ThemedText style={[styles.cardTitle, { color: palette.textInverse }]}>
          {game.title}
        </ThemedText>
        {game.description !== null && (
          <ThemedText style={[styles.cardDescription, { color: palette.textMuted }]}>
            {game.description}
          </ThemedText>
        )}
        {isError && (
          <ThemedText style={[styles.errorText, { color: palette.danger }]}>
            Failed to import. Please try again.
          </ThemedText>
        )}
      </View>

      <Pressable
        onPress={() => {
          if (showViewGame && viewGameId) {
            router.push({ pathname: '/saved-games/[gameId]', params: { gameId: viewGameId } });
            return;
          }

          mutate();
        }}
        disabled={isPending}
        style={({ pressed }) => [
          styles.importButton,
          {
            backgroundColor: showViewGame ? palette.accentOverlay10 : palette.accent,
            borderColor: palette.accentOverlay30,
          },
          (pressed || isPending) && styles.importButtonPressed,
          showViewGame && styles.importButtonDone,
        ]}>
        {isPending ? (
          <ActivityIndicator size="small" color={palette.textOnAccent} />
        ) : showViewGame ? (
          <MaterialCommunityIcons
            name="open-in-new"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.accent}
          />
        ) : (
          <MaterialCommunityIcons
            name="download-outline"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.textOnAccent}
          />
        )}
        <ThemedText
          style={[
            styles.importButtonText,
            { color: showViewGame ? palette.accent : palette.textOnAccent },
          ]}>
          {showViewGame ? 'View Game' : 'Import'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: scaleBySizeClass(14, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    cardContent: {
      gap: scaleBySizeClass(4, sizeClass),
    },
    cardTitle: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    cardDescription: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.regular,
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    importButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      alignSelf: 'flex-start',
    },
    importButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    importButtonDone: {
      borderWidth: 1,
    },
    importButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
