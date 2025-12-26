import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { StatEntryInner } from './stat-entry/StatEntryInner';

export default function StatEntrySheet() {
  const { pendingStatEntry, team1Name, team2Name, team1Roster, addPlayer, addStatRecord } =
    useGameStore();
  const { palette } = useTheme();

  const visible = pendingStatEntry !== null;
  const teamName = pendingStatEntry?.team === 'team1' ? team1Name : team2Name;
  const roster = team1Roster;

  const handleSkip = () => {
    addStatRecord({
      team: pendingStatEntry?.team ?? 'team1',
      goal: null,
      assist: null,
    });
  };

  const handleComplete = (goal: string | null, assist: string | null) => {
    addStatRecord({
      team: pendingStatEntry?.team ?? 'team1',
      goal,
      assist,
    });
  };

  const handleAddPlayer = (name: string) => {
    addPlayer(pendingStatEntry?.team ?? 'team1', name);
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
