import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGames } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getAdvancedGameLabel,
  getAdvancedGameTimestamp,
} from '@/lib/advancedTracking/advancedGameTeamUtils';
import { computeAdvancedImpact } from '@/lib/advancedTracking/advancedImpactUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { Fonts } from '@/theme/theme';

export default function AdvancedGameSelectorModal() {
  const {
    participantId,
    aggregateGameIds = '',
    selectedImpactGameId,
  } = useLocalSearchParams<{
    participantId?: string;
    aggregateGameIds?: string;
    selectedImpactGameId?: string;
  }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const gameIdsParamValue = aggregateGameIds;
  const gameIds = gameIdsParamValue.split(',').filter((id) => id.length > 0);
  const { data: loadedGames = [] } = useAdvancedGames(gameIds);

  const selectableGames = loadedGames
    .filter((game) => {
      if (!participantId) return false;
      const analyticsGame = buildAnalyticsGame(game);
      const impact = computeAdvancedImpact(analyticsGame, participantId, analyticsGame.focusSideId);
      return impact.some((point) => point.onField || point.description.length > 0);
    })
    .sort((a, b) => getAdvancedGameTimestamp(b) - getAdvancedGameTimestamp(a));

  const handleDismiss = () => {
    router.back();
  };

  const handleSelectGame = (gameId: string) => {
    router.dismissTo({
      pathname: '/advancedTracking/analytics/playerStats',
      params: {
        gameId: 'aggregate',
        participantId,
        aggregateGameIds,
        selectedImpactGameId: gameId,
      },
    });
  };

  const defaultGameId = selectableGames[0]?.id ?? null;
  const selectedGameIsEligible =
    !!selectedImpactGameId && selectableGames.some((game) => game.id === selectedImpactGameId);
  const effectiveGameId = selectedGameIsEligible ? selectedImpactGameId : defaultGameId;

  return (
    <BottomSheet
      onDismiss={handleDismiss}
      sheetStyle={[styles.sheet, { backgroundColor: palette.primary }]}>
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
      </View>

      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
          SELECT GAME
        </ThemedText>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <MaterialCommunityIcons
            name="close"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView bounces={false} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectableGames.map((game) => {
          const isSelected = effectiveGameId === game.id;
          return (
            <Pressable
              key={game.id}
              onPress={() => handleSelectGame(game.id)}
              style={({ pressed }) => {
                let backgroundColor: string;
                if (isSelected) {
                  backgroundColor = palette.accentOverlay10;
                } else if (pressed) {
                  backgroundColor = palette.overlay05;
                } else {
                  backgroundColor = 'transparent';
                }
                return [styles.gameRow, { backgroundColor }];
              }}>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? palette.accent : palette.overlay20,
                    backgroundColor: isSelected ? palette.accent : 'transparent',
                  },
                ]}>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check"
                    size={scaleBySizeClass(13, sizeClass)}
                    color={palette.textOnAccent}
                  />
                )}
              </View>
              <View style={styles.gameInfo}>
                <ThemedText style={[styles.gameTitle, { color: palette.textInverse }]}>
                  {getAdvancedGameLabel(game)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '70%',
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    scrollView: {
      maxHeight: 420,
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameInfo: {
      flex: 1,
    },
    gameTitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
