import { AnimatedThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { TurnoverType } from '@/store/gameStore';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryRoster } from '../stat-entry/StatEntryRoster';

type EntryStep = 'type' | 'player';

export interface TurnoverEntryInnerProps {
  teamName: string;
  roster: string[];
  onSkip: () => void;
  onComplete: (type: TurnoverType, player: string | null) => void;
  onAddPlayer: (name: string) => void;
  isMyTeamTurnover: boolean;
  isOpponentTurnover: boolean;
}

export function TurnoverEntryInner({
  teamName,
  roster,
  onSkip,
  onComplete,
  onAddPlayer,
  isMyTeamTurnover,
  isOpponentTurnover,
}: TurnoverEntryInnerProps) {
  // For opponent turnovers, skip directly to player selection with 'block' pre-selected
  const [step, setStep] = useState<EntryStep>(isOpponentTurnover ? 'player' : 'type');
  const [selectedType, setSelectedType] = useState<TurnoverType | null>(
    isOpponentTurnover ? 'block' : null,
  );
  const [newPlayerName, setNewPlayerName] = useState('');
  const { palette, themeMode } = useTheme();

  // Skip button colors - darker in light mode for visibility
  const skipButtonBorder = themeMode === 'light' ? palette.textMuted : palette.overlay20;
  const skipButtonText = themeMode === 'light' ? palette.modalText : palette.textSecondary;

  const handleTypeSelect = (type: TurnoverType) => {
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
    <AnimatedThemedView
      entering={SlideInDown.duration(400)}
      style={[styles.sheet, { shadowColor: palette.shadow }]}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Type Selection, Actions */}
          <View style={styles.leftColumn}>
            <View style={styles.header}>
              <Text style={[styles.teamName, { color: palette.modalText }]}>{teamName}</Text>
              <Animated.Text
                key={step}
                entering={FadeIn.duration(300)}
                style={[styles.stepLabel, { color: palette.modalText }]}>
                {getStepQuestion()}
              </Animated.Text>

              {selectedType && step === 'player' && (
                <Animated.View
                  entering={FadeIn}
                  style={[
                    styles.badge,
                    { backgroundColor: palette.successOverlay15, borderColor: palette.success },
                  ]}>
                  <Text style={[styles.badgeLabel, { color: palette.success }]}>EVENT</Text>
                  <Text style={[styles.badgeValue, { color: palette.success }]}>
                    {getTypeLabel(selectedType)}
                  </Text>
                </Animated.View>
              )}
            </View>

            {step === 'type' ? (
              <View style={styles.typeButtons}>
                <Pressable
                  style={[
                    styles.typeButton,
                    { borderColor: palette.success, backgroundColor: palette.successOverlay15 },
                  ]}
                  onPress={() => handleTypeSelect('block')}>
                  <Text style={[styles.typeButtonText, { color: palette.modalText }]}>
                    {getTypeLabel('block')}
                  </Text>
                </Pressable>
                {!isOpponentTurnover && (
                  <>
                    <Pressable
                      style={[
                        styles.typeButton,
                        { borderColor: palette.danger, backgroundColor: palette.dangerOverlay15 },
                      ]}
                      onPress={() => handleTypeSelect('throwaway')}>
                      <Text style={[styles.typeButtonText, { color: palette.modalText }]}>
                        {getTypeLabel('throwaway')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.typeButton,
                        { borderColor: palette.danger, backgroundColor: palette.dangerOverlay15 },
                      ]}
                      onPress={() => handleTypeSelect('drop')}>
                      <Text style={[styles.typeButtonText, { color: palette.modalText }]}>
                        {getTypeLabel('drop')}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
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
                  <Text style={[styles.addButtonText, { color: palette.textOnAccent }]}>Add</Text>
                </Pressable>
              </View>
            )}

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
                onPress={step === 'type' ? onSkip : handleSkipPlayer}>
                <Text style={[styles.skipText, { color: skipButtonText }]}>
                  {step === 'player' && isOpponentTurnover ? 'No Block' : 'Skip'}
                </Text>
              </Pressable>
              {step === 'player' && !isOpponentTurnover && (
                <Animated.View entering={FadeIn}>
                  <Pressable
                    style={[styles.skipButton, { backgroundColor: palette.cardBgAlt }]}
                    onPress={() => {
                      setStep('type');
                      setSelectedType(null);
                    }}>
                    <Text style={[styles.skipText, { color: palette.textSecondary }]}>Back</Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          </View>

          {/* Right Column: Roster Selection */}
          {step === 'player' && (
            <Animated.View entering={FadeIn} style={styles.rightColumn}>
              <StatEntryRoster
                roster={roster}
                step="goal"
                selectedGoal={null}
                onSelect={handlePlayerSelect}
                maxHeight={280}
              />
            </Animated.View>
          )}
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
  header: {
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
