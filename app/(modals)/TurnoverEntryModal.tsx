import { TurnoverEntryInner } from '@/components/turnover-entry/TurnoverEntryInner';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { useSettingsStore } from '@/store/settingsStore';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function TurnoverEntryScreen() {
  const { type: preselectedType } = useLocalSearchParams<{ type?: TurnoverType }>();
  const {
    pendingTurnoverEntry,
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    addPlayer,
    addTurnoverEvent,
    clearPendingTurnoverEntry,
    currentLine,
  } = useGameStore();
  const { lineCallingEnabled } = useSettingsStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  // Filter roster by current line if set
  const currentLineSet = new Set(currentLine);
  const lineFilteredRoster =
    currentLine.length > 0 ? team1Roster.filter((p) => currentLineSet.has(p.id)) : team1Roster;

  // If no pending entry, just render nothing
  if (!pendingTurnoverEntry) {
    return null;
  }

  // Determine which team's roster to show based on the event type
  const teamWithError = possession;
  const teamName = teamWithError === 'team1' ? team1Name : team2Name;
  const roster = lineFilteredRoster; // Filter by current line if set

  const isMyTeamTurnover = statTrackingEnabled && possession === 'team1';
  const isOpponentTurnover = statTrackingEnabled && possession === 'team2';

  // For opponent turnovers, show my team's roster (for block attribution)
  const displayTeamName = isOpponentTurnover ? team1Name : teamName;
  const displayRoster = isOpponentTurnover ? lineFilteredRoster : roster;

  const handleCancel = () => {
    clearPendingTurnoverEntry();
    router.dismissTo('/Scoreboard');
  };

  const handleComplete = (
    type: TurnoverType,
    playerId: string | null,
    player2Id?: string | null,
  ) => {
    const team =
      type === 'block' ? (possession === 'team1' ? 'team2' : 'team1') : (possession ?? 'team1');

    addTurnoverEvent({
      team,
      subtype: type,
      playerId,
      player2Id,
    });
    router.dismissTo('/Scoreboard');
  };

  const handleAddPlayer = (name: string) => {
    // Always add to team1 roster since that's the only roster we track
    return addPlayer(name);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleCancel}>
        <TurnoverEntryInner
          key={`turnover-${possession}-${preselectedType}`}
          teamName={displayTeamName}
          roster={displayRoster}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
          isMyTeamTurnover={isMyTeamTurnover}
          isOpponentTurnover={isOpponentTurnover}
          preselectedType={preselectedType}
          showAddPlayer={!lineCallingEnabled || currentLine.length === 0}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
