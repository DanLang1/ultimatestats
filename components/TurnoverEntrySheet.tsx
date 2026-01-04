import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { TurnoverEntryInner } from './turnover-entry/TurnoverEntryInner';

export default function TurnoverEntrySheet() {
  const {
    pendingTurnoverEntry,
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    addPlayer,
    addTurnoverEvent,
    clearPendingTurnoverEntry,
  } = useGameStore();

  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  const visible = pendingTurnoverEntry !== null;

  // Determine which team's roster to show based on the event type:
  // - Block: show receiving team's roster (they made the block)
  // - Throwaway/Drop: show the team that HAD possession (they made the error)
  // - For simplicity, we'll show the team that had possession and let the user pick
  const teamWithError = possession; // The team that had the disc before turnover
  const teamName = teamWithError === 'team1' ? team1Name : team2Name;
  const roster = team1Roster; // Only tracking team1 roster

  // Determine if this is "my team" losing possession
  // - We only track team1 stats, so isMyTeamTurnover = team1 had possession
  const isMyTeamTurnover = statTrackingEnabled && possession === 'team1';

  // Determine if this is opponent losing possession
  // - We only care about blocks (my team made a defensive play)
  const isOpponentTurnover = statTrackingEnabled && possession === 'team2';

  // For opponent turnovers, show my team's roster (for block attribution)
  const displayTeamName = isOpponentTurnover ? team1Name : teamName;
  const displayRoster = isOpponentTurnover ? team1Roster : roster;

  const handleSkip = () => {
    clearPendingTurnoverEntry();
  };

  const handleComplete = (
    type: TurnoverType,
    playerId: string | null,
    player2Id?: string | null,
  ) => {
    // Determine which team to attribute the record to
    // Block: attribute to receiving team (+1 for them)
    // Throwaway/Drop/50-50: attribute to team with possession (-1 for them)
    const team =
      type === 'block'
        ? possession === 'team1'
          ? 'team2'
          : 'team1' // Receiving team gets the block credit
        : (possession ?? 'team1'); // Team with error

    addTurnoverEvent({
      team,
      subtype: type,
      playerId,
      player2Id,
    });
  };

  const handleAddPlayer = (name: string) => {
    if (teamWithError) {
      return addPlayer(name);
    }
    return null;
  };

  if (!visible || !pendingTurnoverEntry) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleSkip}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
        onPress={handleSkip}>
        <TurnoverEntryInner
          key={`turnover-${possession}`}
          teamName={displayTeamName}
          roster={displayRoster}
          onSkip={handleSkip}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
          isMyTeamTurnover={isMyTeamTurnover}
          isOpponentTurnover={isOpponentTurnover}
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
