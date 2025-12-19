import { PlayerChip } from '@/components/ui/PlayerChip';
import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';

type EntryStep = 'goal' | 'assist';

interface StatEntryInnerProps {
  team: 'team1' | 'team2';
  teamName: string;
  roster: string[];
  onSkip: () => void;
  onComplete: (goal: string | null, assist: string | null) => void;
  onAddPlayer: (name: string) => void;
}

function StatEntryInner({
  team,
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.teamName}>{teamName}</Text>
          <Animated.Text key={step} entering={FadeIn.duration(300)} style={styles.stepLabel}>
            {step === 'goal' ? 'Who scored?' : 'Who threw the assist?'}
          </Animated.Text>
        </View>

        {/* Player Chips */}
        <Animated.View layout={LinearTransition}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
            keyboardShouldPersistTaps="handled">
            {roster.map((player) => (
              <PlayerChip
                key={player}
                name={player}
                selected={step === 'goal' ? false : player === selectedGoal}
                onPress={() => handlePlayerSelect(player)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Add New Player */}
        <View style={styles.addPlayerRow}>
          <TextInput
            style={styles.input}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            placeholder="Add new player..."
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

        {/* Footer Actions */}
        <Animated.View layout={LinearTransition} style={styles.footer}>
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          {step === 'goal' ? null : (
            <Animated.View entering={FadeIn}>
              <Pressable style={styles.skipButton} onPress={() => setStep('goal')}>
                <Text style={styles.skipText}>Back</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
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
  const team = pendingStatEntry?.team ?? 'team1';
  const teamName = team === 'team1' ? team1Name : team2Name;
  const roster = team === 'team1' ? team1Roster : team2Roster;

  const handleSkip = () => {
    addStatRecord({
      team,
      goal: null,
      assist: null,
    });
  };

  const handleComplete = (goal: string | null, assist: string | null) => {
    addStatRecord({
      team,
      goal,
      assist,
    });
  };

  const handleAddPlayer = (name: string) => {
    addPlayer(team, name);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleSkip}>
      <Pressable style={styles.overlay} onPress={handleSkip}>
        <StatEntryInner
          key={`${team}-${pendingStatEntry.pointNumber}`}
          team={team}
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
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  teamName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    minHeight: 60,
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: palette.accent,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  skipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
});
