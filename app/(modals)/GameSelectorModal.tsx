import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { getSelectablePlayerStatGames } from '@/lib/statsUtils';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GameSelectorModal() {
  const { games, selectedGameId, setSelectedGameId, playerId, team } = usePlayerStatsStore();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const styles = createStyles(sizeClass);

  if (!games || games.length === 0) {
    return null;
  }

  const selectableGames = getSelectablePlayerStatGames(playerId, games, team);

  const handleDismiss = () => {
    router.dismissTo('/PlayerStats');
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    router.dismissTo('/PlayerStats');
  };

  if (selectableGames.length === 0) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Pressable
          style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
          onPress={handleDismiss}>
          <View
            style={[styles.sheet, { backgroundColor: palette.primary }]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
            </View>
            <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
              <Text style={[styles.headerTitle, { color: palette.textMuted }]}>SELECT GAME</Text>
              <Pressable onPress={handleDismiss} hitSlop={12}>
                <MaterialCommunityIcons
                  name="close"
                  size={scaleBySizeClass(24, sizeClass)}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                No games where this player had impact events or recorded playing time.
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  const sortedGames = [...selectableGames].sort(
    (a, b) => getGameDisplayTimestamp(b) - getGameDisplayTimestamp(a),
  );

  // Default to latest game if none selected
  const defaultGameId = sortedGames[0]?.id ?? null;
  const selectedGameIsEligible =
    !!selectedGameId && sortedGames.some((g) => g.id === selectedGameId);
  const effectiveGameId = selectedGameIsEligible ? selectedGameId : defaultGameId;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
        onPress={handleDismiss}>
        <View
          style={[styles.sheet, { backgroundColor: palette.primary }]}
          onStartShouldSetResponder={() => true}>
          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <Text style={[styles.headerTitle, { color: palette.textMuted }]}>SELECT GAME</Text>
            <Pressable onPress={handleDismiss} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(24, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          {/* Game list */}
          <ScrollView
            bounces={false}
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: Math.max(12, bottomInset) }}>
            {sortedGames.map((g) => {
              const isSelected = effectiveGameId === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => handleSelectGame(g.id)}
                  style={({ pressed }) => [
                    styles.gameRow,
                    {
                      backgroundColor: isSelected
                        ? palette.accentOverlay10
                        : pressed
                          ? palette.overlay05
                          : 'transparent',
                    },
                  ]}>
                  {/* Selected indicator */}
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
                        size={scaleBySizeClass(14, sizeClass)}
                        color={palette.textOnAccent}
                      />
                    )}
                  </View>

                  {/* Game info */}
                  <View style={styles.gameInfo}>
                    <Text
                      style={[
                        styles.opponentText,
                        { color: isSelected ? palette.accent : palette.textInverse },
                      ]}>
                      vs {g.team2Name}
                    </Text>
                    <Text style={[styles.dateText, { color: palette.textMuted }]}>
                      {new Date(getGameDisplayTimestamp(g)).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Score */}
                  <Text style={[styles.scoreText, { color: palette.textMuted }]}>
                    {g.team1Score}-{g.team2Score}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
    },
    scrollView: {
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 4,
      gap: 12,
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
    opponentText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
    dateText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: 2,
    },
    scoreText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
    },
    emptyWrap: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
    },
  });
}
