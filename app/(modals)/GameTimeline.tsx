import { ThemedView } from '@/components/ThemedView';
import EventTimeline from '@/components/timeline/EventTimeline';
import { useTheme } from '@/context/ThemeContext';
import { resolveTeamName } from '@/lib/playerUtils';
import { computePointByPointEvents } from '@/lib/timelineUtils';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameTimelineScreen() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ gameId?: string }>();
  // If gameId is present, it's a saved game
  const isSavedGame = !!params.gameId;

  const {
    currentTeam,
    team2Name,
    events,
    savedGames,
    savedTeams,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    currentPointStartTime,
  } = useGameStore();
  const team1Name = currentTeam?.name ?? 'Team 1';

  // If a gameId is passed, load that saved game; otherwise use current game
  const gameData = params.gameId
    ? (() => {
        const game = savedGames.find((g) => g.id === params.gameId);
        if (!game) return null;
        return {
          team1Name: resolveTeamName(game.team1.id, game.team1.name, savedTeams),
          team2Name: game.team2Name,
          events: game.events,
          team1Score: game.team1Score,
          team2Score: game.team2Score,
          startingPossession: game.startingPossession,
          gameTo: game.gameTo,
          roster: game.team1.roster,
          pointStartTimestamps: game.pointStartTimestamps,
        };
      })()
    : {
        team1Name,
        team2Name,
        events,
        team1Score: events.filter((e) => e.type === 'goal' && e.team === 'team1').length,
        team2Score: events.filter((e) => e.type === 'goal' && e.team === 'team2').length,
        startingPossession,
        gameTo,
        roster: currentTeam?.roster ?? [],
        pointStartTimestamps,
      };

  if (!gameData) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.errorText, { color: palette.textMuted }]}>Game not found</Text>
      </ThemedView>
    );
  }

  const pointEvents = computePointByPointEvents(
    gameData.events,
    gameData.startingPossession,
    gameData.gameTo,
    gameData.pointStartTimestamps,
    isSavedGame ? undefined : currentPointStartTime,
  );
  const hasData = pointEvents.length > 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>GAME TIMELINE</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Game Info - team names only, scores shown in EventTimeline */}
      <View style={styles.gameInfo}>
        <Text style={[styles.teamNames, { color: palette.textInverse }]}>
          {gameData.team1Name} vs {gameData.team2Name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {hasData ? (
          <EventTimeline
            points={pointEvents}
            isSavedGame={isSavedGame}
            team2Name={gameData.team2Name}
            gameTo={gameData.gameTo}
            roster={gameData.roster}
            onEditEvent={(eventIndex, turnover) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push({
                pathname: '/EditEventModal',
                params: {
                  eventIndex: String(eventIndex),
                  eventType: 'turnover',
                  playerId: String(turnover.playerId ?? 'null'),
                  player2Id: String(turnover.player2Id ?? 'null'),
                  subtype: turnover.type,
                  originalTeam: turnover.team,
                  gameId: params.gameId ?? 'current',
                },
              });
            }}
            onEditGoal={(eventIndex, playerId, editField) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push({
                pathname: '/EditEventModal',
                params: {
                  eventIndex: String(eventIndex),
                  eventType: 'goal',
                  playerId: String(playerId ?? 'null'),
                  editField,
                  gameId: params.gameId ?? 'current',
                },
              });
            }}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="timeline-outline" size={48} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No events to display
            </Text>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  gameInfo: {
    alignItems: 'center',
    paddingBottom: 16,
    gap: 4,
  },
  teamNames: {
    fontSize: 18,
    fontWeight: '600',
  },
  finalScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
