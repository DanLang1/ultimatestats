import { AnimatedThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getActiveRoster, getPlayerName, UNKNOWN_PLAYER_ID } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryHeader } from './StatEntryHeader';
import { StatEntryRoster } from './StatEntryRoster';

type EntryStep = 'goal' | 'assist';

export interface StatEntryInnerProps {
  teamName: string;
  roster: Player[];
  onCancel: () => void;
  onComplete: (goalPlayerId: string | null, assistPlayerId: string | null) => void;
  onAddPlayer: (name: string) => string | null;
  entryOrder: 'goal_first' | 'assist_first';
  showAddPlayer?: boolean;
}

export function StatEntryInner({
  teamName,
  roster,
  onCancel,
  onComplete,
  onAddPlayer,
  entryOrder,
  showAddPlayer = true,
}: StatEntryInnerProps) {
  // Determine initial step based on order
  const [step, setStep] = useState<EntryStep>(entryOrder === 'goal_first' ? 'goal' : 'assist');

  const [goalPlayerId, setGoalPlayerId] = useState<string | null>(null);
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);

  const [newPlayerName, setNewPlayerName] = useState('');
  const { palette, themeMode } = useTheme();
  const { events } = useGameStore();
  const { isLandscape, sizeClass } = useLayout();
  const { bottom: bottomInset, left: leftInset, right: rightInset } = useSafeAreaInsets();
  const styles = createStyles(sizeClass);
  const compactRosterMaxHeight = isLandscape ? 220 : 400;
  const sheetInsetStyle = {
    paddingBottom: Math.max(10, bottomInset),
    ...(isLandscape
      ? {
          marginLeft: Math.max(12, leftInset),
          marginRight: Math.max(12, rightInset),
        }
      : {}),
  };

  // Only show active players
  const activeRoster = getActiveRoster(roster);

  // Get player name for display
  // If we are in step 2, we show the previous selection
  // If goal_first: Step 1 (Goal) -> Step 2 (Assist, show Goal)
  // If assist_first: Step 1 (Assist) -> Step 2 (Goal, show Assist)

  let badgeValue: string | null = null;
  let badgeLabel: string | null = null;
  let selectedPlayerId: string | null = null;

  if (entryOrder === 'goal_first') {
    if (step === 'assist') {
      badgeValue = getPlayerName(roster, goalPlayerId);
      badgeLabel = 'GOAL';
      selectedPlayerId = goalPlayerId;
    }
  } else {
    // assist_first
    if (step === 'goal') {
      badgeValue = getPlayerName(roster, assistPlayerId);
      badgeLabel = 'ASSIST';
      selectedPlayerId = assistPlayerId;
    }
  }

  // Check if Callahan is possible
  // Show on first step if event before the current goal was a block by our team
  // Note: goal event is now pushed immediately in incrementScore, so we check the second-to-last event
  const lastEvent = events[events.length - 1];
  const prevEvent = events[events.length - 2];

  // If last event is a goal with null players (pending stat entry), check the event before it
  const eventToCheck =
    lastEvent?.type === 'goal' &&
    lastEvent?.goalPlayerId === null &&
    lastEvent?.assistPlayerId === null
      ? prevEvent
      : lastEvent;

  const eventWasOurBlock =
    eventToCheck?.type === 'turnover' &&
    eventToCheck?.subtype === 'block' &&
    eventToCheck?.team === 'team1';

  // Get the blocker's player ID if the relevant event was a block
  const blockerId = eventToCheck?.type === 'turnover' ? eventToCheck.playerId : null;

  // Show Callahan on first step (goal for goal_first, assist for assist_first)
  const isFirstStep =
    (entryOrder === 'goal_first' && step === 'goal') ||
    (entryOrder === 'assist_first' && step === 'assist');
  const showCallahan = isFirstStep && eventWasOurBlock;

  const skipButtonBorder = themeMode === 'light' ? palette.textMuted : palette.overlay20;
  const skipButtonText = themeMode === 'light' ? palette.modalText : palette.textSecondary;

  const handlePlayerSelect = (playerId: string) => {
    if (entryOrder === 'goal_first') {
      if (step === 'goal') {
        setGoalPlayerId(playerId);
        setStep('assist');
        setNewPlayerName('');
      } else {
        // Step is assist
        setAssistPlayerId(playerId);
        onComplete(goalPlayerId, playerId);
      }
    } else {
      // assist_first
      if (step === 'assist') {
        setAssistPlayerId(playerId);
        setStep('goal');
        setNewPlayerName('');
      } else {
        // Step is goal
        setGoalPlayerId(playerId);
        onComplete(playerId, assistPlayerId);
      }
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
      handlePlayerSelect(playerIdToSelect);
    }
  };

  const handleBack = () => {
    if (entryOrder === 'goal_first') {
      setStep('goal');
      setGoalPlayerId(null);
    } else {
      setStep('assist');
      setAssistPlayerId(null);
    }
  };

  // Shared footer buttons
  const renderFooter = () => (
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
        onPress={onCancel}>
        <ThemedText style={[styles.skipText, { color: skipButtonText }]}>Cancel</ThemedText>
      </Pressable>

      {/* Show Back button if we are on the second step */}
      {((entryOrder === 'goal_first' && step === 'assist') ||
        (entryOrder === 'assist_first' && step === 'goal')) && (
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
            onPress={handleBack}>
            <ThemedText style={[styles.skipText, { color: skipButtonText }]}>Back</ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Callahan button - shows when conditions are met */}
      {showCallahan && (
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
            onPress={() => {
              // For Callahan, the goal scorer is always the blocker
              onComplete(blockerId, 'OTHER_TEAM');
            }}>
            <ThemedText style={[styles.skipText, { color: palette.textOnAccent }]}>
              Callahan
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Unknown button - allows recording a play without knowing the player */}
      <Animated.View entering={FadeIn}>
        <Pressable
          style={[
            styles.skipButton,
            {
              backgroundColor: palette.cardBgAlt,
              borderWidth: 1,
              borderColor: palette.overlay20,
            },
          ]}
          onPress={() => handlePlayerSelect(UNKNOWN_PLAYER_ID)}>
          <ThemedText style={[styles.skipText, { color: palette.textMuted }]}>Unknown</ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  // Compact vertical layout when not showing add player input
  if (!showAddPlayer) {
    return (
      <AnimatedThemedView
        entering={SlideInDown.duration(400)}
        style={[styles.sheet, { shadowColor: palette.shadow }, sheetInsetStyle]}
        onStartShouldSetResponder={() => true}>
        <Pressable onPress={() => {}} style={styles.sheetContent}>
          <View style={styles.compactContainer}>
            <StatEntryHeader
              teamName={teamName}
              step={step}
              badgeValue={badgeValue}
              badgeLabel={badgeLabel}
            />
            <StatEntryRoster
              roster={activeRoster}
              selectedPlayerId={selectedPlayerId}
              onSelect={handlePlayerSelect}
              maxHeight={compactRosterMaxHeight}
            />
            {renderFooter()}
          </View>
        </Pressable>
      </AnimatedThemedView>
    );
  }

  // Portrait: vertical stack layout
  if (!isLandscape) {
    return (
      <AnimatedThemedView
        entering={SlideInDown.duration(400)}
        style={[styles.sheet, { shadowColor: palette.shadow }, sheetInsetStyle]}
        onStartShouldSetResponder={() => true}>
        <Pressable onPress={() => {}} style={styles.sheetContent}>
          <View style={styles.compactContainer}>
            <StatEntryHeader
              teamName={teamName}
              step={step}
              badgeValue={badgeValue}
              badgeLabel={badgeLabel}
            />

            <View style={styles.addPlayerRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: palette.border,
                    color: palette.inputText,
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
                <ThemedText style={[styles.addButtonText, { color: palette.textOnAccent }]}>
                  Add
                </ThemedText>
              </Pressable>
            </View>

            <StatEntryRoster
              roster={activeRoster}
              selectedPlayerId={selectedPlayerId}
              onSelect={handlePlayerSelect}
              maxHeight={400}
            />
            {renderFooter()}
          </View>
        </Pressable>
      </AnimatedThemedView>
    );
  }

  // Landscape: side-by-side layout with add player input
  return (
    <AnimatedThemedView
      entering={SlideInDown.duration(400)}
      style={[styles.sheet, { shadowColor: palette.shadow }, sheetInsetStyle]}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Add Player, Actions */}
          <View style={styles.leftColumn}>
            <StatEntryHeader
              teamName={teamName}
              step={step}
              badgeValue={badgeValue}
              badgeLabel={badgeLabel}
            />

            <View style={styles.addPlayerRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: palette.border,
                    color: palette.inputText,
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
                <ThemedText style={[styles.addButtonText, { color: palette.textOnAccent }]}>
                  Add
                </ThemedText>
              </Pressable>
            </View>

            {renderFooter()}
          </View>

          {/* Right Column: Roster Selection */}
          <View style={styles.rightColumn}>
            <StatEntryRoster
              roster={activeRoster}
              selectedPlayerId={selectedPlayerId}
              onSelect={handlePlayerSelect}
              maxHeight={280}
            />
          </View>
        </View>
      </Pressable>
    </AnimatedThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    sheetContent: {
      padding: 16,
    },
    // Compact vertical layout (no add player)
    compactContainer: {
      gap: 12,
    },
    // Side-by-side layout (with add player)
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
      fontSize: scaleBySizeClass(15, sizeClass),
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
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(15, sizeClass),
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
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(15, sizeClass),
    },
  });
}
