import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import EventTimeline from '@/components/basic/timeline/EventTimeline';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canEditBasicPointLine } from '@/lib/basic/pointLineEditUtils';
import { computePointByPointEvents } from '@/lib/basic/timelineUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

export default function GameTimelineScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const params = useLocalSearchParams<{ gameId?: string }>();
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
    currentGameId,
    pointTimerEnabled,
    pointLines: currentPointLines,
  } = useGameStore();
  const team1Name = currentTeam.name;

  const gameData = params.gameId
    ? (() => {
        const game = savedGames.find((savedGame) => savedGame.id === params.gameId);
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
        team1Score: events.filter((event) => event.type === 'goal' && event.team === 'team1')
          .length,
        team2Score: events.filter((event) => event.type === 'goal' && event.team === 'team2')
          .length,
        startingPossession,
        gameTo,
        autoHalftimeEnabled,
        roster: currentTeam.roster,
        pointStartTimestamps,
        timingEnabled: pointTimerEnabled,
        pointLines: currentPointLines,
      };

  if (!gameData) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText style={[styles.errorText, { color: palette.textMuted }]}>
          Game not found
        </ThemedText>
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
  const canEditTiming = gameData.timingEnabled;
  const hasLineupData = (gameData.pointLines?.length ?? 0) > 0;
  const canEditLineup = (pointNumber: number) =>
    canEditBasicPointLine({
      pointNumber,
      pointLines: gameData.pointLines,
      currentPoint,
      displayedGameId: params.gameId ?? null,
      currentGameId,
    });

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
          {gameData.team1Name} vs {gameData.team2Name}
        </ThemedText>
        {(canToggleSplits || hasLineupData) && (
          <View style={styles.timelineControlsRow}>
            {canToggleSplits && (
              <Pressable
                onPress={() => setShowSplitSeparators((prev) => !prev)}
                style={[
                  styles.timelineToggleChip,
                  {
                    backgroundColor: showSplitSeparators
                      ? palette.accentOverlay10
                      : palette.overlay08,
                    borderColor: showSplitSeparators ? palette.accent : palette.border,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="arrow-split-horizontal"
                  size={scaleBySizeClass(12, sizeClass)}
                  color={showSplitSeparators ? palette.accent : palette.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.timelineToggleText,
                    { color: showSplitSeparators ? palette.accent : palette.textSecondary },
                  ]}>
                  Show Splits: {showSplitSeparators ? 'On' : 'Off'}
                </ThemedText>
              </Pressable>
            )}
            {hasLineupData && (
              <Pressable
                onPress={() => setShowLineups((prev) => !prev)}
                style={[
                  styles.timelineToggleChip,
                  {
                    backgroundColor: showLineups ? palette.accentOverlay10 : palette.overlay08,
                    borderColor: showLineups ? palette.accent : palette.border,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={scaleBySizeClass(12, sizeClass)}
                  color={showLineups ? palette.accent : palette.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.timelineToggleText,
                    { color: showLineups ? palette.accent : palette.textSecondary },
                  ]}>
                  Show Lines: {showLineups ? 'On' : 'Off'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>

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
          canEditLineup={canEditLineup}
          onEditEvent={(eventIndex, turnover) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
              pathname: '/EditEventModal',
              params: {
                eventIndex: String(eventIndex),
                eventType: 'turnover',
                playerId: turnover.playerId ?? 'null',
                player2Id: turnover.player2Id ?? 'null',
                subtype: turnover.type,
                originalTeam: turnover.team,
                gameId: params.gameId ?? 'current',
              },
            });
          }}
          onEditGoal={(eventIndex, playerId, editField) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
              pathname: '/EditEventModal',
              params: {
                eventIndex: String(eventIndex),
                eventType: 'goal',
                playerId: playerId ?? 'null',
                editField,
                gameId: params.gameId ?? 'current',
              },
            });
          }}
          onEditLineup={(pointNumber) => {
            router.push({
              pathname: '/EditPointLineModal',
              params: {
                pointNumber: String(pointNumber),
                gameId: params.gameId ?? 'current',
              },
            });
          }}
          onEditPointDuration={
            canEditTiming
              ? (goalEventIndex, currentDurationMs) => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({
                    pathname: '/EditDurationModal',
                    params: {
                      eventIndex: String(goalEventIndex),
                      gameId: params.gameId ?? 'current',
                      currentDurationMs: String(currentDurationMs ?? '0'),
                      editorType: 'point',
                      title: 'Edit Point Duration',
                    },
                  });
                }
              : undefined
          }
          onEditEventTime={
            canEditTiming
              ? (eventIndex, currentElapsedMs, eventType) => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({
                    pathname: '/EditDurationModal',
                    params: {
                      eventIndex: String(eventIndex),
                      gameId: params.gameId ?? 'current',
                      currentDurationMs: String(currentElapsedMs ?? '0'),
                      editorType: 'event',
                      title: eventType === 'timeout' ? 'Edit Timeout Time' : 'Edit Event Time',
                    },
                  });
                }
              : undefined
          }
          currentPoint={isSavedGame ? undefined : currentPoint}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="timeline-outline"
            size={scaleBySizeClass(48, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            No events to display
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
      fontFamily: Fonts.semiBold,
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
    errorText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
      marginTop: 100,
    },
  });
}
