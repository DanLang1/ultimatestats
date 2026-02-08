import { AnimatedThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { getActiveRoster, getPlayerName, UNKNOWN_PLAYER_ID } from '@/lib/playerUtils';
import { Player } from '@/lib/storage/types';
import { TurnoverType } from '@/store/gameStore.types';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { StatEntryRoster } from '../stat-entry/StatEntryRoster';

type EntryStep = 'type' | 'player';

export interface TurnoverEntryInnerProps {
  teamName: string;
  roster: Player[];
  onCancel: () => void;
  onComplete: (type: TurnoverType, playerId: string | null, player2Id?: string | null) => void;
  onAddPlayer: (name: string) => string | null;
  isMyTeamTurnover: boolean;
  isOpponentTurnover: boolean;
  preselectedType?: TurnoverType;
  showAddPlayer?: boolean;
}

export function TurnoverEntryInner({
  teamName,
  roster,
  onCancel,
  onComplete,
  onAddPlayer,
  isMyTeamTurnover,
  isOpponentTurnover,
  preselectedType,
  showAddPlayer = true,
}: TurnoverEntryInnerProps) {
  // For opponent turnovers or preselected types, skip directly to player selection
  const shouldStartAtPlayer = isOpponentTurnover || !!preselectedType;
  const [step, setStep] = useState<EntryStep>(shouldStartAtPlayer ? 'player' : 'type');
  const [selectedType, setSelectedType] = useState<TurnoverType | null>(
    preselectedType ?? (isOpponentTurnover ? 'block' : null),
  );
  const [newPlayerName, setNewPlayerName] = useState('');
  // For 50/50: track first selected player ID (thrower)
  const [fiftyFiftyFirstPlayerId, setFiftyFiftyFirstPlayerId] = useState<string | null>(null);
  const { palette, themeMode } = useTheme();

  // Only show active players
  const activeRoster = getActiveRoster(roster);

  const isFiftyFiftyMode = selectedType === 'fiftyfifty';

  // Get player name for display
  const fiftyFiftyFirstPlayerName = getPlayerName(roster, fiftyFiftyFirstPlayerId);

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

  const handlePlayerSelect = (playerId: string) => {
    if (!selectedType) return;

    // For 50/50: first tap = thrower, second tap = receiver
    if (selectedType === 'fiftyfifty') {
      if (!fiftyFiftyFirstPlayerId) {
        // First player selection (thrower)
        setFiftyFiftyFirstPlayerId(playerId);
      } else {
        // Second player selection (receiver) - complete the entry
        onComplete(selectedType, fiftyFiftyFirstPlayerId, playerId);
      }
      return;
    }

    // Normal single-player turnover
    onComplete(selectedType, playerId);
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
    if (playerIdToSelect && selectedType) {
      // For 50/50, handle first/second player logic
      if (selectedType === 'fiftyfifty') {
        if (!fiftyFiftyFirstPlayerId) {
          setFiftyFiftyFirstPlayerId(playerIdToSelect);
        } else {
          onComplete(selectedType, fiftyFiftyFirstPlayerId, playerIdToSelect);
        }
      } else {
        // Normal turnover - complete with this player
        onComplete(selectedType, playerIdToSelect);
      }
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
      case 'fiftyfifty':
        return '50/50';
    }
  };

  const getStepQuestion = () => {
    switch (selectedType) {
      case 'block':
        return 'Who made the block?';
      case 'throwaway':
        return 'Who threw it away?';
      case 'drop':
        return 'Who dropped it?';
      case 'fiftyfifty':
        return fiftyFiftyFirstPlayerId ? 'Who dropped it?' : 'Who threw it?';
      default:
        return 'What happened?';
    }
  };

  // Filter out first player for 50/50 mode
  const displayRoster = isFiftyFiftyMode
    ? activeRoster.filter((p) => p.id !== fiftyFiftyFirstPlayerId)
    : activeRoster;

  // Render header content (team name, question, badges)
  const renderHeader = () => (
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
            { backgroundColor: palette.dangerOverlay15, borderColor: palette.danger },
          ]}>
          <Text style={[styles.badgeLabel, { color: palette.danger }]}>EVENT</Text>
          <Text style={[styles.badgeValue, { color: palette.danger }]}>
            {getTypeLabel(selectedType)}
          </Text>
        </Animated.View>
      )}

      {/* Show first selected player for 50/50 */}
      {isFiftyFiftyMode && fiftyFiftyFirstPlayerName && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.badge,
            { backgroundColor: palette.indigoOverlay20, borderColor: palette.accent },
          ]}>
          <Text style={[styles.badgeLabel, { color: palette.accent }]}>THROWER</Text>
          <Text style={[styles.badgeValue, { color: palette.accent }]}>
            {fiftyFiftyFirstPlayerName}
          </Text>
        </Animated.View>
      )}
    </View>
  );

  // Render type selection buttons
  const renderTypeButtons = () => (
    <View style={styles.typeButtons}>
      <Pressable
        style={[
          styles.typeButton,
          { borderColor: palette.danger, backgroundColor: palette.dangerOverlay15 },
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
          <Pressable
            style={[
              styles.typeButton,
              { borderColor: palette.danger, backgroundColor: palette.dangerOverlay15 },
            ]}
            onPress={() => handleTypeSelect('fiftyfifty')}>
            <Text style={[styles.typeButtonText, { color: palette.modalText }]}>
              {getTypeLabel('fiftyfifty')}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  // Render cancel button (available on all steps) or unknown button (player step)
  const renderCancelButton = () => (
    <Animated.View layout={LinearTransition} style={styles.footer}>
      {/* Cancel button - always visible */}
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
        <Text style={[styles.skipText, { color: skipButtonText }]}>Cancel</Text>
      </Pressable>

      {/* Unknown button - shows only on player step */}
      {step === 'player' && (
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
          <Text style={[styles.skipText, { color: palette.textMuted }]}>Unknown</Text>
        </Pressable>
      )}
    </Animated.View>
  );

  // Compact layout for player step without add player input
  if (step === 'player' && !showAddPlayer) {
    return (
      <AnimatedThemedView
        entering={SlideInDown.duration(400)}
        style={[styles.sheet, { shadowColor: palette.shadow }]}
        onStartShouldSetResponder={() => true}>
        <Pressable onPress={() => {}} style={styles.sheetContent}>
          <View style={styles.compactContainer}>
            {renderHeader()}
            <StatEntryRoster roster={displayRoster} onSelect={handlePlayerSelect} maxHeight={220} />
            {renderCancelButton()}
          </View>
        </Pressable>
      </AnimatedThemedView>
    );
  }

  // Standard side-by-side layout
  return (
    <AnimatedThemedView
      entering={SlideInDown.duration(400)}
      style={[styles.sheet, { shadowColor: palette.shadow }]}
      onStartShouldSetResponder={() => true}>
      <Pressable onPress={() => {}} style={styles.sheetContent}>
        <View style={styles.sideBySideContainer}>
          {/* Left Column: Info, Type Selection, Actions */}
          <View style={styles.leftColumn}>
            {renderHeader()}

            {step === 'type' ? (
              renderTypeButtons()
            ) : (
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
                  <Text style={[styles.addButtonText, { color: palette.textOnAccent }]}>Add</Text>
                </Pressable>
              </View>
            )}

            {renderCancelButton()}
          </View>

          {/* Right Column: Roster Selection */}
          {step === 'player' && (
            <Animated.View entering={FadeIn} style={styles.rightColumn}>
              <StatEntryRoster
                roster={displayRoster}
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
