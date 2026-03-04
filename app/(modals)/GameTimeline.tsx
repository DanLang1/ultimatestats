import { ThemedView } from '@/components/ThemedView';
import EventTimeline from '@/components/timeline/EventTimeline';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { resolveTeamName } from '@/lib/playerUtils';
import { computePointByPointEvents } from '@/lib/timelineUtils';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameTimelineScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const params = useLocalSearchParams<{ gameId?: string }>();
  // If gameId is present, it's a saved game
  const isSavedGame = !!params.gameId;
  const [showSplitSeparators, setShowSplitSeparators] = useState(true);
  const [showLineups, setShowLineups] = useState(true);
  const {
    currentTeam,
    team2Name,
    events,
    savedGames,
    savedTeams,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
    pointStartTimestamps,
    currentPointStartTime,
    currentPoint,
    pointTimerEnabled,
    pointLines: currentPointLines,
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
          autoHalftimeEnabled: game.autoHalftimeEnabled ?? true,
          roster: game.team1.roster,
          pointStartTimestamps: game.pointStartTimestamps,
          timingEnabled: game.events.some((event) => event.elapsedMs !== undefined),
          pointLines: game.pointLines ?? [],
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
        autoHalftimeEnabled,
        roster: currentTeam?.roster ?? [],
        pointStartTimestamps,
        timingEnabled: pointTimerEnabled,
        pointLines: currentPointLines,
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
    gameData.autoHalftimeEnabled,
  );
  const hasData = pointEvents.length > 0;
  const canToggleSplits = gameData.timingEnabled;
  const hasLineupData = (gameData.pointLines?.length ?? 0) > 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
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
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>GAME TIMELINE</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Game Info - team names only, scores shown in EventTimeline */}
      <View style={styles.gameInfo}>
        <Text style={[styles.teamNames, { color: palette.textInverse }]}>
          {gameData.team1Name} vs {gameData.team2Name}
        </Text>
        {(canToggleSplits || hasLineupData) && (
          <View style={styles.timelineControlsRow}>
            {canToggleSplits && (
              <Pressable
                onPress={() => setShowSplitSeparators((prev) => !prev)}
                style={[
                  styles.timelineToggleChip,
                  {
                    backgroundColor: showSplitSeparators ? palette.overlay08 : palette.overlay15,
                    borderColor: showSplitSeparators ? palette.accent : palette.overlay15,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="arrow-split-horizontal"
                  size={scaleBySizeClass(12, sizeClass)}
                  color={showSplitSeparators ? palette.accent : palette.textMuted}
                />
                <Text
                  style={[
                    styles.timelineToggleText,
                    { color: showSplitSeparators ? palette.accent : palette.textMuted },
                  ]}>
                  Show Splits: {showSplitSeparators ? 'On' : 'Off'}
                </Text>
              </Pressable>
            )}
            {hasLineupData && (
              <Pressable
                onPress={() => setShowLineups((prev) => !prev)}
                style={[
                  styles.timelineToggleChip,
                  {
                    backgroundColor: showLineups ? palette.overlay08 : palette.overlay15,
                    borderColor: showLineups ? palette.accent : palette.overlay15,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={scaleBySizeClass(12, sizeClass)}
                  color={showLineups ? palette.accent : palette.textMuted}
                />
                <Text
                  style={[
                    styles.timelineToggleText,
                    { color: showLineups ? palette.accent : palette.textMuted },
                  ]}>
                  Show Lines: {showLineups ? 'On' : 'Off'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        {hasData ? (
          <EventTimeline
            points={pointEvents}
            isSavedGame={isSavedGame}
            team2Name={gameData.team2Name}
            gameTo={gameData.gameTo}
            roster={gameData.roster}
            timingEnabled={gameData.timingEnabled}
            showSplitSeparators={showSplitSeparators}
            pointLines={gameData.pointLines}
            showLineups={showLineups}
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
            onEditDuration={(goalEventIndex, currentDurationMs) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push({
                pathname: '/EditDurationModal',
                params: {
                  eventIndex: String(goalEventIndex),
                  gameId: params.gameId ?? 'current',
                  currentDurationMs: String(currentDurationMs ?? '0'),
                },
              });
            }}
            currentPoint={isSavedGame ? undefined : currentPoint}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="timeline-outline"
              size={scaleBySizeClass(48, sizeClass)}
              color={palette.textMuted}
            />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No events to display
            </Text>
          </View>
        )}
      </ScrollView>
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
    timelineControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scaleBySizeClass(6, sizeClass),
      gap: scaleBySizeClass(8, sizeClass),
    },
    timelineToggleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      borderWidth: 1,
      borderRadius: scaleBySizeClass(16, sizeClass),
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(6, sizeClass),
    },
    timelineToggleText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
    teamNames: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '600',
    },
    finalScore: {
      fontSize: scaleBySizeClass(24, sizeClass),
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
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
    emptySubtext: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    errorText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
      marginTop: 100,
    },
  });
}
