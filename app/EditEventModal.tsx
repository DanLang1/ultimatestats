import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { getPlayerName } from '@/lib/playerUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TURNOVER_TYPES: { value: TurnoverType; label: string }[] = [
  { value: 'throwaway', label: 'Throwaway' },
  { value: 'drop', label: 'Drop' },
  { value: 'block', label: 'Block' },
  { value: 'fiftyfifty', label: '50/50' },
];

export default function EditEventModal() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{
    eventIndex: string;
    eventType: string;
    playerId: string;
    player2Id: string;
    subtype: string;
    editField: 'scorer' | 'assist'; // For goals: which field is being edited
    gameId: string; // 'current' or saved game ID
  }>();

  const {
    currentTeam,
    savedGames,
    updateEvent,
    deleteEvent,
    updateSavedGameEvent,
    deleteSavedGameEvent,
  } = useGameStore();

  // Get roster from either current game or saved game
  const isSavedGame = params.gameId && params.gameId !== 'current';
  const savedGame = isSavedGame ? savedGames.find((g) => g.id === params.gameId) : null;
  const roster = savedGame?.team1.roster ?? currentTeam?.roster ?? [];

  // Sort roster alphabetically by name (matches StatEntrySheet pattern)
  const sortedRoster = [...roster].sort((a, b) => a.name.localeCompare(b.name));

  const eventIndex = parseInt(params.eventIndex ?? '-1', 10);

  // Use params for event type since saved games don't have events in store
  const eventType = params.eventType as 'turnover' | 'goal' | undefined;

  // Local state for editing
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    params.playerId === 'null' ? null : (params.playerId ?? null),
  );
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<string | null>(
    params.player2Id === 'null' ? null : (params.player2Id ?? null),
  );
  const [selectedSubtype, setSelectedSubtype] = useState<TurnoverType>(
    (params.subtype as TurnoverType) ?? 'throwaway',
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // For 50/50: always start on step 1 when editing, so user can review/change thrower first
  const [fiftyFiftyStep, setFiftyFiftyStep] = useState<1 | 2>(1);

  const isFiftyFifty = selectedSubtype === 'fiftyfifty';

  // Guard: Invalid params
  if (eventIndex < 0 || !eventType) {
    return null;
  }

  const isGoal = eventType === 'goal';
  const isTurnover = eventType === 'turnover';

  const handleSave = async () => {
    if (isTurnover) {
      const updates = {
        playerId: selectedPlayerId,
        player2Id: selectedSubtype === 'fiftyfifty' ? selectedPlayer2Id : null,
        subtype: selectedSubtype,
      };

      if (isSavedGame && params.gameId) {
        await updateSavedGameEvent(params.gameId, eventIndex, updates);
      } else {
        updateEvent(eventIndex, updates);
      }
    } else if (isGoal) {
      // Only update the field that was edited
      const updates =
        params.editField === 'scorer'
          ? { goalPlayerId: selectedPlayerId }
          : { assistPlayerId: selectedPlayerId };

      if (isSavedGame && params.gameId) {
        await updateSavedGameEvent(params.gameId, eventIndex, updates);
      } else {
        updateEvent(eventIndex, updates);
      }
    }
    router.back();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    let success: boolean;
    if (isSavedGame && params.gameId) {
      success = await deleteSavedGameEvent(params.gameId, eventIndex);
    } else {
      success = deleteEvent(eventIndex);
    }

    if (success) {
      router.back();
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const playerName = getPlayerName(roster, selectedPlayerId);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
        onPress={handleDismiss}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.modalBg }]}
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.overlay15 }]}>
            <Text style={[styles.headerTitle, { color: palette.modalText }]}>
              {isGoal
                ? params.editField === 'scorer'
                  ? 'Edit Goal'
                  : 'Edit Assist'
                : 'Edit Event'}
            </Text>
            <View style={styles.headerActions}>
              {isTurnover && (
                <>
                  <Pressable
                    onPress={handleDelete}
                    hitSlop={12}
                    style={[styles.headerButton, { backgroundColor: palette.dangerOverlay15 }]}>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={palette.danger}
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    hitSlop={12}
                    style={[styles.headerButton, { backgroundColor: palette.accentOverlay30 }]}>
                    <MaterialCommunityIcons name="check" size={20} color={palette.accent} />
                  </Pressable>
                </>
              )}
              {isGoal && (
                <Pressable
                  onPress={handleSave}
                  hitSlop={12}
                  style={[styles.headerButton, { backgroundColor: palette.accentOverlay30 }]}>
                  <MaterialCommunityIcons name="check" size={20} color={palette.accent} />
                </Pressable>
              )}
              <Pressable onPress={handleDismiss} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color={palette.textMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {/* Event Type Section */}
            {isTurnover && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                  EVENT TYPE
                </Text>
                <View style={styles.typeGrid}>
                  {TURNOVER_TYPES.map((type) => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor:
                            selectedSubtype === type.value
                              ? palette.accentOverlay30
                              : palette.overlay10,
                          borderColor:
                            selectedSubtype === type.value ? palette.accent : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSelectedSubtype(type.value);
                        // When switching to 50/50, reset to step 1
                        if (type.value === 'fiftyfifty') {
                          setFiftyFiftyStep(1);
                          setSelectedPlayer2Id(null);
                        }
                      }}>
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color:
                              selectedSubtype === type.value ? palette.accent : palette.modalText,
                          },
                        ]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Player Selection - For 50/50, this becomes Step 1 (Thrower) or Step 2 (Receiver) */}
            {isTurnover && (!isFiftyFifty || fiftyFiftyStep === 1) && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                  {selectedSubtype === 'block'
                    ? 'BLOCKED BY'
                    : isFiftyFifty
                      ? 'STEP 1: THROWER (Who threw it?)'
                      : 'PLAYER'}
                </Text>
                <View style={styles.chipsContainer}>
                  <PlayerChip
                    name="Unknown"
                    selected={selectedPlayerId === null}
                    onPress={() => {
                      setSelectedPlayerId(null);
                      if (isFiftyFifty) {
                        setFiftyFiftyStep(2);
                      }
                    }}
                  />
                  {sortedRoster.map((player) => (
                    <PlayerChip
                      key={player.id}
                      name={player.name}
                      selected={selectedPlayerId === player.id}
                      onPress={() => {
                        setSelectedPlayerId(player.id);
                        if (isFiftyFifty) {
                          setFiftyFiftyStep(2);
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Step 2 for 50/50: Receiver selection */}
            {isTurnover && isFiftyFifty && fiftyFiftyStep === 2 && (
              <View style={styles.section}>
                {/* Show thrower badge */}
                <View
                  style={[
                    styles.throwerBadge,
                    { backgroundColor: palette.accentOverlay30, borderColor: palette.accent },
                  ]}>
                  <Text style={[styles.throwerBadgeLabel, { color: palette.accent }]}>THROWER</Text>
                  <Text style={[styles.throwerBadgeValue, { color: palette.accent }]}>
                    {getPlayerName(roster, selectedPlayerId) ?? 'Unknown'}
                  </Text>
                  <Pressable
                    hitSlop={12}
                    onPress={() => setFiftyFiftyStep(1)}
                    style={styles.throwerBadgeEdit}>
                    <MaterialCommunityIcons name="pencil" size={14} color={palette.accent} />
                  </Pressable>
                </View>

                <Text
                  style={[styles.sectionLabel, { color: palette.textSecondary, marginTop: 16 }]}>
                  STEP 2: RECEIVER (Who dropped it?)
                </Text>
                <View style={styles.chipsContainer}>
                  <PlayerChip
                    name="Unknown"
                    selected={selectedPlayer2Id === null}
                    onPress={() => setSelectedPlayer2Id(null)}
                  />
                  {sortedRoster
                    .filter((p) => p.id !== selectedPlayerId)
                    .map((player) => (
                      <PlayerChip
                        key={player.id}
                        name={player.name}
                        selected={selectedPlayer2Id === player.id}
                        onPress={() => setSelectedPlayer2Id(player.id)}
                      />
                    ))}
                </View>
              </View>
            )}

            {/* Goal editing - scorer and assist selection */}
            {/* Goal editing - single field based on editField */}
            {isGoal && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                  {params.editField === 'scorer' ? 'GOAL SCORED BY' : 'ASSISTED BY'}
                </Text>
                <View style={styles.chipsContainer}>
                  <PlayerChip
                    name="Unknown"
                    selected={selectedPlayerId === null}
                    onPress={() => setSelectedPlayerId(null)}
                  />
                  {sortedRoster.map((player) => (
                    <PlayerChip
                      key={player.id}
                      name={player.name}
                      selected={selectedPlayerId === player.id}
                      onPress={() => setSelectedPlayerId(player.id)}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <Pressable
          style={[styles.confirmOverlay, { backgroundColor: palette.overlayModal }]}
          onPress={() => setShowDeleteConfirm(false)}>
          <View
            style={[
              styles.confirmDialog,
              { backgroundColor: palette.modalBg, borderColor: palette.overlay15 },
            ]}
            onStartShouldSetResponder={() => true}>
            <Text style={[styles.confirmTitle, { color: palette.modalText }]}>Delete Event?</Text>
            <Text style={[styles.confirmMessage, { color: palette.textSecondary }]}>
              Delete this {selectedSubtype}
              {playerName ? ` by ${playerName}` : ''}?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmButton, { borderColor: palette.accent }]}
                onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.confirmButtonText, { color: palette.accent }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: palette.danger }]}
                onPress={confirmDelete}>
                <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalInfo: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Confirmation Dialog
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // 50/50 Thrower Badge
  throwerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  throwerBadgeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  throwerBadgeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  throwerBadgeEdit: {
    marginLeft: 4,
  },
});
