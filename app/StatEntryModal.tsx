import { StatEntryInner } from '@/components/stat-entry/StatEntryInner';
import { useTheme } from '@/context/ThemeContext';
import { checkGameOver } from '@/lib/gameUtils';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function StatEntryScreen() {
  const { pendingStatEntry, currentTeam, team2Name, addPlayer, addGoalEvent } = useGameStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  // If no pending entry, just render nothing - the useEffect in index.tsx won't push here
  if (!pendingStatEntry) {
    return null;
  }

  const teamName = pendingStatEntry.team === 'team1' ? team1Name : team2Name;
  const roster = team1Roster; // Only track team1 roster

  const handleComplete = (goalPlayerId: string | null, assistPlayerId: string | null) => {
    addGoalEvent({
      team: pendingStatEntry.team,
      goalPlayerId,
      assistPlayerId,
    });
    router.dismiss();

    // Check if game ended
    const state = useGameStore.getState();
    const isGameOver = checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

    if (isGameOver) {
      setTimeout(() => {
        router.push('/WinModal');
      }, 100);
    }
  };

  const handleSkip = () => {
    // Record with null goal/assist
    addGoalEvent({
      team: pendingStatEntry.team,
      goalPlayerId: null,
      assistPlayerId: null,
    });
    router.dismiss();

    // Check if game ended
    const state = useGameStore.getState();
    const isGameOver = checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

    if (isGameOver) {
      setTimeout(() => {
        router.push('/WinModal');
      }, 100);
    }
  };

  const handleAddPlayer = (name: string) => {
    return addPlayer(name);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleSkip}>
        <StatEntryInner
          key={`${teamName}-${pendingStatEntry.pointNumber}`}
          teamName={teamName}
          roster={roster}
          onSkip={handleSkip}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
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
