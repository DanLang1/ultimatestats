import { useTheme } from '@/context/ThemeContext';
import { getImpactStats, hasImpactTimelineData } from '@/lib/statsUtils';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameSelectorModal() {
  const { games, selectedGameId, setSelectedGameId, playerId, team, roster } =
    usePlayerStatsStore();
  const { palette } = useTheme();

  // If no games, just return null
  if (!games || games.length === 0) {
    return null;
  }

  const impactGames = playerId
    ? games.filter((game) =>
        hasImpactTimelineData(getImpactStats(playerId, game.events, team, roster || undefined)),
      )
    : [];

  // Default to latest game if none selected
  const defaultGameId = [...impactGames].sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null;
  const effectiveGameId = selectedGameId ?? defaultGameId;

  const handleDismiss = () => {
    router.dismissTo('/PlayerStats');
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    router.dismissTo('/PlayerStats');
  };

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
              <MaterialCommunityIcons name="close" size={24} color={palette.textMuted} />
            </Pressable>
          </View>

          {/* Game list */}
          <ScrollView bounces={false} style={styles.scrollView}>
            {impactGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  No game impact data recorded for this player yet.
                </Text>
              </View>
            ) : (
              [...impactGames]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((g) => {
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
                            size={14}
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
                          {new Date(g.createdAt).toLocaleDateString(undefined, {
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
                })
            )}
          </ScrollView>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scrollView: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
