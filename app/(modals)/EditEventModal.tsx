import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getAllPlayersByPoint } from '@/lib/lineUtils';
import { getPlayerName } from '@/lib/playerUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { TurnoverType } from '@/store/basic/gameStore.types';
import { Fonts } from '@/theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

// Extended type to include opponent turnover and opponent block for editing
type EditableTurnoverType = TurnoverType | 'opponentTurn' | 'opponentBlock';

function parseEventType(param: string | undefined): 'turnover' | 'goal' | undefined {
  if (param === 'turnover' || param === 'goal') return param;
  return undefined;
}

function parseSubtype(param: string | undefined): EditableTurnoverType {
  if (
    param === 'throwaway' ||
    param === 'drop' ||
    param === 'fiftyfifty' ||
    param === 'block' ||
    param === 'opponentTurn' ||
    param === 'opponentBlock'
  ) {
    return param;
  }
  return 'throwaway';
}

function parseTeam(param: string | undefined): 'team1' | 'team2' {
  return param === 'team2' ? 'team2' : 'team1';
}

const ALL_TURNOVER_TYPES: {
  value: EditableTurnoverType;
  label: string;
  category: 'ourTurnover' | 'ourBlock' | 'oppTurnover' | 'oppBlock';
}[] = [
  { value: 'throwaway', label: 'Throwaway', category: 'ourTurnover' },
  { value: 'drop', label: 'Drop', category: 'ourTurnover' },
  { value: 'fiftyfifty', label: '50/50', category: 'ourTurnover' },
  { value: 'opponentBlock', label: 'OPP BLOCK', category: 'oppBlock' },
  { value: 'block', label: 'Block', category: 'ourBlock' },
  { value: 'opponentTurn', label: 'OPP TURN', category: 'oppTurnover' },
];

export default function EditEventModal() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();
  const params = useLocalSearchParams<{
    eventIndex: string;
    eventType: string;
    playerId: string;
    player2Id: string;
    subtype: string;
    originalTeam: string; // 'team1' or 'team2' - which team the original event was by
    editField: 'scorer' | 'assist'; // For goals: which field is being edited
    gameId: string; // 'current' or saved game ID
  }>();

  const {
    currentTeam,
    events,
    pointLines,
    savedGames,
    updateEvent,
    deleteEvent,
    updateSavedGameEvent,
    deleteSavedGameEvent,
  } = useGameStore();

  // Get roster from either current game or saved game
  const isSavedGame = params.gameId && params.gameId !== 'current';
  const savedGame = isSavedGame ? savedGames.find((g) => g.id === params.gameId) : null;
  const roster = savedGame?.team1.roster ?? currentTeam.roster;
  const activeEvents = savedGame?.events ?? events;
  const activePointLines = savedGame?.pointLines ?? pointLines;

  // Sort roster alphabetically by name (matches StatEntrySheet pattern)
  const sortedRoster = [...roster].sort((a, b) => a.name.localeCompare(b.name));

  const eventIndex = parseInt(params.eventIndex ?? '-1', 10);

  // Use params for event type since saved games don't have events in store
  const eventType = parseEventType(params.eventType);

  // Map stored subtype to editable subtype based on team
  // Opponent events are stored with regular subtypes but displayed as opponentBlock/opponentTurn
  const getInitialSubtype = (): EditableTurnoverType => {
    const storedSubtype = parseSubtype(params.subtype);
    const team = parseTeam(params.originalTeam);

    if (team === 'team2') {
      // Opponent event - map to opponent-specific types
      if (storedSubtype === 'block') return 'opponentBlock';
      return 'opponentTurn'; // throwaway, drop, etc. from opponent = OPP TURN
    }
    return storedSubtype ?? 'throwaway';
  };

  // Local state for editing
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    params.playerId === 'null' ? null : (params.playerId ?? null),
  );
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<string | null>(
    params.player2Id === 'null' ? null : (params.player2Id ?? null),
  );
  const [selectedSubtype, setSelectedSubtype] = useState<EditableTurnoverType>(getInitialSubtype);

  const activeEvent = activeEvents[eventIndex];
  const pointPlayersByPoint = getAllPlayersByPoint(activePointLines ?? []);
  const selectedPlayerIds = new Set(
    [selectedPlayerId, selectedPlayer2Id].filter(
      (playerId): playerId is string => playerId !== null,
    ),
  );
  const pointPlayerIds = activeEvent?.pointNumber
    ? pointPlayersByPoint.get(activeEvent.pointNumber)
    : undefined;
  const eligiblePlayerIds =
    pointPlayerIds && pointPlayerIds.size > 0
      ? new Set([...pointPlayerIds, ...selectedPlayerIds])
      : null;
  const selectableRoster =
    eligiblePlayerIds === null
      ? sortedRoster
      : sortedRoster.filter((player) => eligiblePlayerIds.has(player.id));

  const originalSubtype = parseSubtype(params.subtype);
  const originalTeam = parseTeam(params.originalTeam);
  const isOriginalOpponentEvent = originalTeam === 'team2';

  // OPP BLOCK = opponent blocked us (team2, subtype block) - we lost the disc via their block
  // OPP TURN = opponent's unforced turnover (team2, subtype throwaway) - we gained the disc via their error
  const isOriginalOppBlock =
    isOriginalOpponentEvent && (originalSubtype === 'block' || originalSubtype === 'opponentBlock');
  const isOriginalOppTurn = isOriginalOpponentEvent && !isOriginalOppBlock;

  const availableTypes = ALL_TURNOVER_TYPES.filter((type) => {
    if (isOriginalOppTurn) {
      // OPP TURN (opponent's unforced error) can become our block OR stay as opp turn
      return type.value === 'block' || type.value === 'opponentTurn';
    }
    if (originalSubtype === 'block' && !isOriginalOpponentEvent) {
      // Our block can become opponent turnover OR stay as block
      return type.value === 'opponentTurn' || type.value === 'block';
    }
    if (isOriginalOppBlock) {
      // OPP BLOCK (opponent blocked us) can become our turnover OR stay as opp block
      return type.category === 'ourTurnover' || type.category === 'oppBlock';
    }
    // Our turnovers (throwaway, drop, 50/50) can become other our turnovers OR opp block
    // (opp block = opponent blocked us, which is a valid correction)
    // Cannot become OPP TURN - that's a fundamentally different possession change
    return type.category === 'ourTurnover' || type.category === 'oppBlock';
  });

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
      // Handle team change based on subtype
      // - opponentTurn/opponentBlock: convert to team2 (opponent event)
      // - our turnovers (drop/throwaway/50-50): if originally opponent event, convert to team1
      // - block: if originally opponent event, convert to team1 (we blocked them)
      const isOurTurnover =
        selectedSubtype === 'throwaway' ||
        selectedSubtype === 'drop' ||
        selectedSubtype === 'fiftyfifty';

      const oppEvent = selectedSubtype === 'opponentTurn' || selectedSubtype === 'opponentBlock';

      let newTeam: 'team1' | 'team2' | undefined;
      if (oppEvent) {
        newTeam = 'team2';
      } else if ((selectedSubtype === 'block' || isOurTurnover) && isOriginalOpponentEvent) {
        newTeam = 'team1';
      } else {
        newTeam = undefined;
      }

      // Map virtual types to storage types:
      // - opponentTurn -> throwaway (opponent's unforced error)
      // - opponentBlock -> block (opponent blocked us, stored as opponent's block)
      let actualSubtype: TurnoverType;
      if (selectedSubtype === 'opponentTurn') {
        actualSubtype = 'throwaway';
      } else if (selectedSubtype === 'opponentBlock') {
        actualSubtype = 'block';
      } else {
        actualSubtype = selectedSubtype;
      }

      const updates = {
        playerId: oppEvent ? null : selectedPlayerId,
        player2Id: selectedSubtype === 'fiftyfifty' ? selectedPlayer2Id : null,
        subtype: actualSubtype,
        ...(newTeam && { team: newTeam }),
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
    let subtypeLabel: string;
    if (selectedSubtype === 'opponentTurn') {
      subtypeLabel = 'OPP TURN';
    } else if (selectedSubtype === 'opponentBlock') {
      subtypeLabel = 'OPP BLOCK';
    } else {
      subtypeLabel = selectedSubtype;
    }

    showAlert({
      title: 'Delete Event?',
      message: `Delete this ${subtypeLabel}${playerName ? ` by ${playerName}` : ''}?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            let success: boolean;
            if (isSavedGame && params.gameId) {
              success = await deleteSavedGameEvent(params.gameId, eventIndex);
            } else {
              success = deleteEvent(eventIndex);
            }

            if (success) {
              router.back();
            }
          },
        },
      ],
    });
  };

  const handleDismiss = () => {
    router.back();
  };

  const playerName = getPlayerName(roster, selectedPlayerId);

  let headerTitle: string;
  if (isGoal) {
    headerTitle = params.editField === 'scorer' ? 'Edit Goal' : 'Edit Assist';
  } else {
    headerTitle = 'Edit Event';
  }

  let playerSectionLabel: string;
  if (selectedSubtype === 'block') {
    playerSectionLabel = 'BLOCKED BY';
  } else if (isFiftyFifty) {
    playerSectionLabel = 'STEP 1: THROWER (Who threw it?)';
  } else {
    playerSectionLabel = 'PLAYER';
  }

  return (
    <BottomSheet
      onDismiss={handleDismiss}
      sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.overlay15 }]}>
        <ThemedText style={[styles.headerTitle, { color: palette.modalText }]}>
          {headerTitle}
        </ThemedText>
        <View style={styles.headerActions}>
          {isTurnover && (
            <>
              <Pressable
                onPress={handleDelete}
                hitSlop={12}
                style={[styles.headerButton, { backgroundColor: palette.dangerOverlay15 }]}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={scaleBySizeClass(20, sizeClass)}
                  color={palette.danger}
                />
              </Pressable>
              <Pressable
                onPress={handleSave}
                hitSlop={12}
                style={[styles.headerButton, { backgroundColor: palette.accentOverlay30 }]}>
                <MaterialCommunityIcons
                  name="check"
                  size={scaleBySizeClass(20, sizeClass)}
                  color={palette.accent}
                />
              </Pressable>
            </>
          )}
          {isGoal && (
            <Pressable
              onPress={handleSave}
              hitSlop={12}
              style={[styles.headerButton, { backgroundColor: palette.accentOverlay30 }]}>
              <MaterialCommunityIcons
                name="check"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.accent}
              />
            </Pressable>
          )}
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* Event Type Section */}
        {isTurnover && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: palette.textSecondary }]}>
              EVENT TYPE
            </ThemedText>
            <View style={styles.typeGrid}>
              {availableTypes.map((type) => (
                <Pressable
                  key={type.value}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        selectedSubtype === type.value
                          ? palette.accentOverlay30
                          : palette.overlay10,
                      borderColor: selectedSubtype === type.value ? palette.accent : 'transparent',
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
                  <ThemedText
                    style={[
                      styles.typeChipText,
                      {
                        color: selectedSubtype === type.value ? palette.accent : palette.modalText,
                      },
                    ]}>
                    {type.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Player Selection - For 50/50, this becomes Step 1 (Thrower) or Step 2 (Receiver) */}
        {/* Hide for OPP TURN and OPP BLOCK since those don't have player attribution */}
        {isTurnover &&
          selectedSubtype !== 'opponentTurn' &&
          selectedSubtype !== 'opponentBlock' &&
          (!isFiftyFifty || fiftyFiftyStep === 1) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: palette.textSecondary }]}>
                {playerSectionLabel}
              </ThemedText>
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
                {selectableRoster.map((player) => (
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
              <ThemedText style={[styles.throwerBadgeLabel, { color: palette.accent }]}>
                THROWER
              </ThemedText>
              <ThemedText style={[styles.throwerBadgeValue, { color: palette.accent }]}>
                {getPlayerName(roster, selectedPlayerId) ?? 'Unknown'}
              </ThemedText>
              <Pressable
                hitSlop={12}
                onPress={() => setFiftyFiftyStep(1)}
                style={styles.throwerBadgeEdit}>
                <MaterialCommunityIcons
                  name="pencil"
                  size={scaleBySizeClass(14, sizeClass)}
                  color={palette.accent}
                />
              </Pressable>
            </View>

            {selectedPlayer2Id !== null && (
              <View
                style={[
                  styles.throwerBadge,
                  {
                    backgroundColor: palette.successOverlay15,
                    borderColor: palette.success,
                    marginTop: 10,
                  },
                ]}>
                <ThemedText style={[styles.throwerBadgeLabel, { color: palette.success }]}>
                  RECEIVER
                </ThemedText>
                <ThemedText style={[styles.throwerBadgeValue, { color: palette.success }]}>
                  {getPlayerName(roster, selectedPlayer2Id) ?? 'Unknown'}
                </ThemedText>
              </View>
            )}

            <ThemedText
              style={[styles.sectionLabel, { color: palette.textSecondary, marginTop: 16 }]}>
              STEP 2: RECEIVER (Who dropped it?)
            </ThemedText>
            <View style={styles.chipsContainer}>
              <PlayerChip
                name="Unknown"
                selected={selectedPlayer2Id === null}
                onPress={() => setSelectedPlayer2Id(null)}
              />
              {selectableRoster.map((player) => (
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
            <ThemedText style={[styles.sectionLabel, { color: palette.textSecondary }]}>
              {params.editField === 'scorer' ? 'GOAL SCORED BY' : 'ASSISTED BY'}
            </ThemedText>
            <View style={styles.chipsContainer}>
              <PlayerChip
                name="Unknown"
                selected={selectedPlayerId === null}
                onPress={() => setSelectedPlayerId(null)}
              />
              {selectableRoster.map((player) => (
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
    </BottomSheet>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
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
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
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
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
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
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
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
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    throwerBadgeValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    throwerBadgeEdit: {
      marginLeft: 4,
    },
  });
}
