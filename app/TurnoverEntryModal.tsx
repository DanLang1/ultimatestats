import { TurnoverEntryInner } from '@/components/turnover-entry/TurnoverEntryInner';
import { useTheme } from '@/context/ThemeContext';
import { TurnoverType, useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function TurnoverEntryScreen() {
  const {
    pendingTurnoverEntry,
    possession,
    statTrackingEnabled,
    team1Name,
    team2Name,
    team1Roster,
    addPlayer,
    addTurnoverRecord,
    clearPendingTurnoverEntry,
  } = useGameStore();
  const { palette } = useTheme();

  // If no pending entry, just render nothing
  if (!pendingTurnoverEntry) {
    return null;
  }

  // Determine which team's roster to show based on the event type
  const teamWithError = possession;
  const teamName = teamWithError === 'team1' ? team1Name : team2Name;
  const roster = team1Roster;

  const isMyTeamTurnover = statTrackingEnabled && possession === 'team1';
  const isOpponentTurnover = statTrackingEnabled && possession === 'team2';

  // For opponent turnovers, show my team's roster (for block attribution)
  const displayTeamName = isOpponentTurnover ? team1Name : teamName;
  const displayRoster = isOpponentTurnover ? team1Roster : roster;

  const handleSkip = () => {
    clearPendingTurnoverEntry();
    router.dismissTo('/');
  };

  const handleComplete = (type: TurnoverType, player: string | null) => {
    const team =
      type === 'block' ? (possession === 'team1' ? 'team2' : 'team1') : (possession ?? 'team1');

    addTurnoverRecord({
      team,
      type,
      player,
    });
    router.dismissTo('/');
  };

  const handleAddPlayer = (name: string) => {
    if (teamWithError) {
      addPlayer(teamWithError, name);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleSkip}>
        <TurnoverEntryInner
          key={`turnover-${possession}`}
          teamName={displayTeamName}
          roster={displayRoster}
          onSkip={handleSkip}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
          receivingTeam={pendingTurnoverEntry.receivingTeam}
          isMyTeamTurnover={isMyTeamTurnover}
          isOpponentTurnover={isOpponentTurnover}
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
