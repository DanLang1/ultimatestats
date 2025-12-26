import { AnimatedThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryHeader } from './StatEntryHeader';
import { StatEntryRoster } from './StatEntryRoster';

type EntryStep = 'goal' | 'assist';

export interface StatEntryInnerProps {
  teamName: string;
  roster: string[];
  onSkip: () => void;
  onComplete: (goal: string | null, assist: string | null) => void;
  onAddPlayer: (name: string) => void;
}

export function StatEntryInner({
  teamName,
  roster,
  onSkip,
  onComplete,
  onAddPlayer,
}: StatEntryInnerProps) {
  const [step, setStep] = useState<EntryStep>('goal');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const { palette } = useTheme();

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
    <AnimatedThemedView
      entering={SlideInDown.duration(400)}
      style={[styles.sheet, { shadowColor: palette.shadow }]}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Add Player, Actions */}
          <View style={styles.leftColumn}>
            <StatEntryHeader teamName={teamName} step={step} selectedGoal={selectedGoal} />

            <View style={styles.addPlayerRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: palette.border,
                    color: palette.modalText,
                    backgroundColor: palette.inputBg,
                  },
                ]}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder="Add player..."
                placeholderTextColor={palette.textMuted}
                onSubmitEditing={handleAddPlayer}
                returnKeyType="done"
              />
              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: palette.accent },
                  !newPlayerName.trim() && styles.addButtonDisabled,
                ]}
                onPress={handleAddPlayer}
                disabled={!newPlayerName.trim()}>
                <Text style={[styles.addButtonText, { color: palette.textInverse }]}>Add</Text>
              </Pressable>
            </View>

            <Animated.View layout={LinearTransition} style={styles.footer}>
              <Pressable
                style={[styles.skipButton, { backgroundColor: palette.cardBgAlt }]}
                onPress={onSkip}>
                <Text style={[styles.skipText, { color: palette.textSecondary }]}>Skip</Text>
              </Pressable>
              {step === 'goal' ? null : (
                <Animated.View entering={FadeIn}>
                  <Pressable
                    style={[styles.skipButton, { backgroundColor: palette.cardBgAlt }]}
                    onPress={() => {
                      setStep('goal');
                      setSelectedGoal(null);
                    }}>
                    <Text style={[styles.skipText, { color: palette.textSecondary }]}>Back</Text>
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
    </AnimatedThemedView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 10,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addButton: {
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
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
  },
  skipText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
