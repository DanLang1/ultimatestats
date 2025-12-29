import { TurnoverEntryInner } from '@/components/turnover-entry/TurnoverEntryInner';
import { useTheme } from '@/context/ThemeContext';
import { TurnoverType, useGameStore } from '@/store/gameStore';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function TurnoverEntryScreen() {
  const { type: preselectedType } = useLocalSearchParams<{ type?: TurnoverType }>();
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

  const handleComplete = (type: TurnoverType, player: string | null, player2?: string | null) => {
    const team =
      type === 'block' ? (possession === 'team1' ? 'team2' : 'team1') : (possession ?? 'team1');

    addTurnoverRecord({
      team,
      type,
      player,
      player2,
    });
    router.dismissTo('/');
  };

  const handleAddPlayer = (name: string) => {
    // Always add to team1 roster since that's the only roster we track
    addPlayer(name);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleSkip}>
        <TurnoverEntryInner
          key={`turnover-${possession}-${preselectedType}`}
          teamName={displayTeamName}
          roster={displayRoster}
          onSkip={handleSkip}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
          isMyTeamTurnover={isMyTeamTurnover}
          isOpponentTurnover={isOpponentTurnover}
          preselectedType={preselectedType}
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
