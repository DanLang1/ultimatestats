import { palette } from '@/constants/theme';
import { TurnoverType, useGameStore } from '@/store/gameStore';
import React, { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryRoster } from './stat-entry/StatEntryRoster';

type EntryStep = 'type' | 'player';

interface TurnoverEntryInnerProps {
  teamName: string;
  roster: string[];
  onSkip: () => void;
  onComplete: (type: TurnoverType, player: string | null) => void;
  onAddPlayer: (name: string) => void;
  receivingTeam: 'team1' | 'team2';
  // When true, my team had possession and lost it (throwaway/drop = my fault, block = opponent's play)
  isMyTeamTurnover: boolean;
  // When true, opponent had possession and lost it (we only care about blocks by my team)
  isOpponentTurnover: boolean;
}

function TurnoverEntryInner({
  teamName,
  roster,
  onSkip,
  onComplete,
  onAddPlayer,
  isMyTeamTurnover,
  isOpponentTurnover,
}: TurnoverEntryInnerProps) {
  const [step, setStep] = useState<EntryStep>('type');
  const [selectedType, setSelectedType] = useState<TurnoverType | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleTypeSelect = (type: TurnoverType) => {
    // For blocks when my team lost possession: opponent made the block, skip player selection
    if (type === 'block' && isMyTeamTurnover) {
      onComplete(type, null);
      return;
    }

    setSelectedType(type);
    setStep('player');
  };

  const handlePlayerSelect = (playerName: string) => {
    if (selectedType) {
      onComplete(selectedType, playerName);
    }
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    onAddPlayer(trimmed);
    setNewPlayerName('');
    Keyboard.dismiss();

    // Auto-select the new player
    handlePlayerSelect(trimmed);
  };

  const handleSkipPlayer = () => {
    if (selectedType) {
      onComplete(selectedType, null);
    }
  };

  const getTypeLabel = (type: TurnoverType) => {
    switch (type) {
      case 'block':
        // If my team lost possession, it's the opponent's block
        // If opponent lost possession (in My Team mode), it's our block
        if (isMyTeamTurnover) return 'Opponent Block';
        if (isOpponentTurnover) return 'My Team Block';
        return 'Block';
      case 'throwaway':
        return 'Throwaway';
      case 'drop':
        return 'Drop';
    }
  };

  const getStepQuestion = () => {
    if (step === 'type') return 'What happened?';
    switch (selectedType) {
      case 'block':
        return 'Who made the block?';
      case 'throwaway':
        return 'Who threw it away?';
      case 'drop':
        return 'Who dropped it?';
      default:
        return 'Who?';
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(400)}
      style={styles.sheet}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Type Selection, Actions */}
          <View style={styles.leftColumn}>
            <View style={styles.header}>
              <Text style={styles.teamName}>{teamName}</Text>
              <Animated.Text key={step} entering={FadeIn.duration(300)} style={styles.stepLabel}>
                {getStepQuestion()}
              </Animated.Text>

              {selectedType && step === 'player' && (
                <Animated.View entering={FadeIn} style={styles.badge}>
                  <Text style={styles.badgeLabel}>EVENT</Text>
                  <Text style={styles.badgeValue}>{getTypeLabel(selectedType)}</Text>
                </Animated.View>
              )}
            </View>

            {step === 'type' ? (
              <View style={styles.typeButtons}>
                <Pressable
                  style={[styles.typeButton, { borderColor: palette.accent }]}
                  onPress={() => handleTypeSelect('block')}>
                  <Text style={styles.typeButtonText}>{getTypeLabel('block')}</Text>
                </Pressable>
                {/* Only show throwaway/drop if NOT opponent turnover in My Team mode */}
                {!isOpponentTurnover && (
                  <>
                    <Pressable
                      style={[styles.typeButton, { borderColor: '#e74c3c' }]}
                      onPress={() => handleTypeSelect('throwaway')}>
                      <Text style={styles.typeButtonText}>{getTypeLabel('throwaway')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.typeButton, { borderColor: '#e67e22' }]}
                      onPress={() => handleTypeSelect('drop')}>
                      <Text style={styles.typeButtonText}>{getTypeLabel('drop')}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.addPlayerRow}>
                <TextInput
                  style={styles.input}
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                  placeholder="Add player..."
                  placeholderTextColor="#999"
                  onSubmitEditing={handleAddPlayer}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.addButton, !newPlayerName.trim() && styles.addButtonDisabled]}
                  onPress={handleAddPlayer}
                  disabled={!newPlayerName.trim()}>
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              </View>
            )}

            <Animated.View layout={LinearTransition} style={styles.footer}>
              <Pressable
                style={styles.skipButton}
                onPress={step === 'type' ? onSkip : handleSkipPlayer}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              {step === 'player' && (
                <Animated.View entering={FadeIn}>
                  <Pressable
                    style={styles.skipButton}
                    onPress={() => {
                      setStep('type');
                      setSelectedType(null);
                    }}>
                    <Text style={styles.skipText}>Back</Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          </View>

          {/* Right Column: Roster Selection (only in player step) */}
          {step === 'player' && (
            <Animated.View entering={FadeIn} style={styles.rightColumn}>
              <StatEntryRoster
                roster={roster}
                step="goal" // Reusing the step type, just means no player is "disabled"
                selectedGoal={null}
                onSelect={handlePlayerSelect}
                maxHeight={280}
              />
            </Animated.View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function TurnoverEntrySheet() {
  const {
    pendingTurnoverEntry,
    possession,
    statTrackingEnabled,
    team1Name,
    team2Name,
    team1Roster,
    team2Roster,
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
  const roster = teamWithError === 'team1' ? team1Roster : team2Roster;

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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetContent: {
    padding: 16,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
  },
  header: {
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginTop: 2,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#f9f9f9',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: palette.accent,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  skipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
});
