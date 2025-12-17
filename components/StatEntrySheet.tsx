import { PlayerChip } from '@/components/ui/PlayerChip';
import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type EntryStep = 'goal' | 'assist';

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

  const [step, setStep] = useState<EntryStep>('goal');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const slideAnim = useRef(new Animated.Value(300)).current;

  const visible = pendingStatEntry !== null;
  const team = pendingStatEntry?.team ?? 'team1';
  const teamName = team === 'team1' ? team1Name : team2Name;
  const roster = team === 'team1' ? team1Roster : team2Roster;

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setStep('goal');
      setSelectedGoal(null);
      setNewPlayerName('');
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  const handleSkip = () => {
    addStatRecord({
      team,
      goal: null,
      assist: null,
    });
  };

  const handlePlayerSelect = (playerName: string) => {
    if (step === 'goal') {
      setSelectedGoal(playerName);
      setStep('assist');
    } else {
      // Assist selection - complete the record
      addStatRecord({
        team,
        goal: selectedGoal,
        assist: playerName,
      });
    }
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    addPlayer(team, trimmed);
    setNewPlayerName('');
    Keyboard.dismiss();

    // Auto-select the new player
    handlePlayerSelect(trimmed);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleSkip}>
      <Pressable style={styles.overlay} onPress={handleSkip}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}>
          <Pressable onPress={() => {}} style={styles.sheetContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.teamName}>{teamName}</Text>
              <Text style={styles.stepLabel}>
                {step === 'goal' ? 'Who scored?' : 'Who threw the assist?'}
              </Text>
            </View>

            {/* Player Chips */}
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
            <View style={styles.footer}>
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
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
