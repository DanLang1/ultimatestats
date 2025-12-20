import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import React, { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryHeader } from './stat-entry/StatEntryHeader';
import { StatEntryRoster } from './stat-entry/StatEntryRoster';

type EntryStep = 'goal' | 'assist';

interface StatEntryInnerProps {
  teamName: string;
  roster: string[];
  onSkip: () => void;
  onComplete: (goal: string | null, assist: string | null) => void;
  onAddPlayer: (name: string) => void;
}

function StatEntryInner({
  teamName,
  roster,
  onSkip,
  onComplete,
  onAddPlayer,
}: StatEntryInnerProps) {
  const [step, setStep] = useState<EntryStep>('goal');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  const handlePlayerSelect = (playerName: string) => {
    if (step === 'goal') {
      setSelectedGoal(playerName);
      setStep('assist');
      setNewPlayerName(''); // Clear filter after selection
    } else {
      onComplete(selectedGoal, playerName);
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

  return (
    <Animated.View
      entering={SlideInDown.duration(400)}
      style={styles.sheet}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Add Player, Actions */}
          <View style={styles.leftColumn}>
            <StatEntryHeader teamName={teamName} step={step} selectedGoal={selectedGoal} />

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

            <Animated.View layout={LinearTransition} style={styles.footer}>
              <Pressable style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              {step === 'goal' ? null : (
                <Animated.View entering={FadeIn}>
                  <Pressable
                    style={styles.skipButton}
                    onPress={() => {
                      setStep('goal');
                      setSelectedGoal(null);
                    }}>
                    <Text style={styles.skipText}>Back</Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          </View>

          {/* Right Column: Roster Selection */}
          <View style={styles.rightColumn}>
            <StatEntryRoster
              roster={roster}
              step={step}
              selectedGoal={selectedGoal}
              onSelect={handlePlayerSelect}
              maxHeight={280}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function StatEntrySheet() {
  const {
    pendingStatEntry,
    team1Name,
    team2Name,
    team1Roster,
    team2Roster,
    addPlayer,
    addStatRecord,
  } = useGameStore();

  const visible = pendingStatEntry !== null;
  const teamName = pendingStatEntry?.team === 'team1' ? team1Name : team2Name;
  const roster = pendingStatEntry?.team === 'team1' ? team1Roster : team2Roster;

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
      <Pressable style={styles.overlay} onPress={handleSkip}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
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
