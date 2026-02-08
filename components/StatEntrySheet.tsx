import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { StatEntryInner } from './stat-entry/StatEntryInner';

export default function StatEntrySheet() {
  const {
    pendingStatEntry,
    currentTeam,
    team2Name,
    addPlayer,
    addGoalEvent,
    cancelPendingGoal,
    currentLine,
  } = useGameStore();
  const { lineCallingEnabled, statEntryOrder } = useSettingsStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const visible = pendingStatEntry !== null;
  const teamName = pendingStatEntry?.team === 'team1' ? team1Name : team2Name;
  const roster = team1Roster;

  const handleCancel = () => {
    cancelPendingGoal();
  };

  const handleComplete = (goalPlayerId: string | null, assistPlayerId: string | null) => {
    addGoalEvent({
      goalPlayerId,
      assistPlayerId,
    });
  };

  const handleAddPlayer = (name: string) => {
    return addPlayer(name);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
        onPress={handleCancel}>
        <StatEntryInner
          key={`${teamName}-${pendingStatEntry.pointNumber}`}
          teamName={teamName}
          roster={roster}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
          showAddPlayer={!lineCallingEnabled || currentLine.length === 0}
          entryOrder={statEntryOrder}
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
