import { AnimatedThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { getActiveRoster, getPlayerName } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { useGameStore } from '@/store/gameStore';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryHeader } from './StatEntryHeader';
import { StatEntryRoster } from './StatEntryRoster';

type EntryStep = 'goal' | 'assist';

export interface StatEntryInnerProps {
  teamName: string;
  roster: Player[];
  onSkip: () => void;
  onComplete: (goalPlayerId: string | null, assistPlayerId: string | null) => void;
  onAddPlayer: (name: string) => string | null;
}

export function StatEntryInner({
  teamName,
  roster,
  onSkip,
  onComplete,
  onAddPlayer,
}: StatEntryInnerProps) {
  const [step, setStep] = useState<EntryStep>('goal');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const { palette, themeMode } = useTheme();
  const { events } = useGameStore();

  // Only show active players
  const activeRoster = getActiveRoster(roster);

  // Get player name for display
  const selectedGoalName = getPlayerName(roster, selectedGoalId);

  // Check if Callahan is possible: last event was a block by this player
  const lastEvent = events[events.length - 1];
  const canShowCallahan =
    lastEvent?.type === 'turnover' &&
    lastEvent?.subtype === 'block' &&
    lastEvent?.playerId === selectedGoalId;

  // Skip button colors - darker in light mode for visibility
  const skipButtonBorder = themeMode === 'light' ? palette.textMuted : palette.overlay20;
  const skipButtonText = themeMode === 'light' ? palette.modalText : palette.textSecondary;

  const handlePlayerSelect = (playerId: string) => {
    if (step === 'goal') {
      setSelectedGoalId(playerId);
      setStep('assist');
      setNewPlayerName(''); // Clear filter after selection
    } else {
      onComplete(selectedGoalId, playerId);
    }
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    const newPlayerId = onAddPlayer(trimmed);
    setNewPlayerName('');
    Keyboard.dismiss();

    // Determine which player ID to use
    let playerIdToSelect = newPlayerId;

    // If player wasn't added (duplicate), find the existing player
    if (!playerIdToSelect) {
      const lowerName = trimmed.toLowerCase();
      const existingPlayer = activeRoster.find((p) => p.name.toLowerCase() === lowerName);
      playerIdToSelect = existingPlayer?.id ?? null;
    }

    // Auto-select the player (new or existing)
    if (playerIdToSelect) {
      if (step === 'goal') {
        setSelectedGoalId(playerIdToSelect);
        setStep('assist');
      } else {
        // On assist step, complete with current goal and this player as assist
        onComplete(selectedGoalId, playerIdToSelect);
      }
    }
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
            <StatEntryHeader teamName={teamName} step={step} selectedGoal={selectedGoalName} />

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
                maxLength={20}
              />
              <Pressable
                style={[
                  styles.addButton,
                  { backgroundColor: palette.accent },
                  !newPlayerName.trim() && styles.addButtonDisabled,
                ]}
                onPress={handleAddPlayer}
                disabled={!newPlayerName.trim()}>
                <Text style={[styles.addButtonText, { color: palette.textOnAccent }]}>Add</Text>
              </Pressable>
            </View>

            <Animated.View layout={LinearTransition} style={styles.footer}>
              <Pressable
                style={[
                  styles.skipButton,
                  {
                    backgroundColor: palette.cardBgAlt,
                    borderWidth: 1,
                    borderColor: skipButtonBorder,
                  },
                ]}
                onPress={onSkip}>
                <Text style={[styles.skipText, { color: skipButtonText }]}>Skip</Text>
              </Pressable>
              {step === 'goal' ? null : (
                <>
                  <Animated.View entering={FadeIn}>
                    <Pressable
                      style={[
                        styles.skipButton,
                        {
                          backgroundColor: palette.cardBgAlt,
                          borderWidth: 1,
                          borderColor: skipButtonBorder,
                        },
                      ]}
                      onPress={() => {
                        setStep('goal');
                        setSelectedGoalId(null);
                      }}>
                      <Text style={[styles.skipText, { color: skipButtonText }]}>Back</Text>
                    </Pressable>
                  </Animated.View>
                  {canShowCallahan && (
                    <Animated.View entering={FadeIn}>
                      <Pressable
                        style={[
                          styles.skipButton,
                          {
                            backgroundColor: palette.success,
                            borderWidth: 1,
                            borderColor: palette.success,
                          },
                        ]}
                        onPress={() => onComplete(selectedGoalId, 'OTHER_TEAM')}>
                        <Text style={[styles.skipText, { color: palette.textOnAccent }]}>
                          Callahan
                        </Text>
                      </Pressable>
                    </Animated.View>
                  )}
                </>
              )}
            </Animated.View>
          </View>

          {/* Right Column: Roster Selection */}
          <View style={styles.rightColumn}>
            <StatEntryRoster
              roster={activeRoster}
              step={step}
              selectedGoalId={selectedGoalId}
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
