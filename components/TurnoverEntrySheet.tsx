import { TurnoverType, useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { TurnoverEntryInner } from './turnover-entry/TurnoverEntryInner';

export default function TurnoverEntrySheet() {
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

  const visible = pendingTurnoverEntry !== null;

  // Determine which team's roster to show based on the event type:
  // - Block: show receiving team's roster (they made the block)
  // - Throwaway/Drop: show the team that HAD possession (they made the error)
  // For simplicity, we'll show the team that had possession and let the user pick
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

  const handleComplete = (type: TurnoverType, player: string | null) => {
    // Determine which team to attribute the record to
    // Block: attribute to receiving team (+1 for them)
    // Throwaway/Drop: attribute to team with possession (-1 for them)
    const team =
      type === 'block'
        ? possession === 'team1'
          ? 'team2'
          : 'team1' // Receiving team gets the block credit
        : (possession ?? 'team1'); // Team with error

    addTurnoverRecord({
      team,
      type,
      player,
    });
  };

  const handleAddPlayer = (name: string) => {
    if (teamWithError) {
      addPlayer(teamWithError, name);
    }
  };

  if (!visible || !pendingTurnoverEntry) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleSkip}>
      <Pressable style={styles.overlay} onPress={handleSkip}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayDark40,
    justifyContent: 'flex-end',
  },
});
