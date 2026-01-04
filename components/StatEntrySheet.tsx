import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { StatEntryInner } from './stat-entry/StatEntryInner';

export default function StatEntrySheet() {
  const { pendingStatEntry, currentTeam, team2Name, addPlayer, addGoalEvent } = useGameStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const visible = pendingStatEntry !== null;
  const teamName = pendingStatEntry?.team === 'team1' ? team1Name : team2Name;
  const roster = team1Roster;

  const handleSkip = () => {
    addGoalEvent({
      team: pendingStatEntry?.team ?? 'team1',
      goalPlayerId: null,
      assistPlayerId: null,
    });
  };

  const handleComplete = (goalPlayerId: string | null, assistPlayerId: string | null) => {
    addGoalEvent({
      team: pendingStatEntry?.team ?? 'team1',
      goalPlayerId,
      assistPlayerId,
    });
  };

  const handleAddPlayer = (name: string) => {
    return addPlayer(name);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleSkip}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
