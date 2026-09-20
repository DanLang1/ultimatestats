import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getPlayerNumberIdentity,
  normalizePlayerNumber,
} from '@/lib/advancedTracking/voiceNumberUtils';
import { MAX_PLAYER_NUMBER_LENGTH, MODAL_MAX_WIDTH_FORM } from '@/lib/constants';
import { hasPlayerRecordedStats, hasPlayerRecordedStatsInSavedGames } from '@/lib/playerUtils';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import {
  hasPlayerRecordedActionsInActiveAdvancedGame,
  useGameStore,
} from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export default function EditPlayerModal() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { currentTeam, setCurrentTeam, saveCurrentTeam, events, savedGames, updateRosterPlayer } =
    useGameStore();
  const { mmpColor, fmpColor } = useSettingsStore();

  const { removePlayerFromPresets } = useLinePresetsStore();

  const roster = currentTeam.roster;
  const player = roster.find((p) => p.id === playerId);

  // Initialize state from player
  const [name, setName] = useState(player?.name ?? '');
  const [number, setNumber] = useState(player?.number ?? '');
  const [isActive, setIsActive] = useState(player?.isActive ?? true);
  const [matchingType, setMatchingType] = useState<MatchingType | null>(
    player?.matchingType ?? null,
  );
  const [role, setRole] = useState<PlayerRole | null>(player?.role ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Declaratively redirect if player not found (after delete or invalid ID)
  if (!player) {
    return <Redirect href="/EditRoster" />;
  }

  // Check if name already exists (excluding current player)
  const nameExists =
    name.trim() !== '' &&
    roster.some((p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== player.id);
  const normalizedNumber = normalizePlayerNumber(number);
  const numberIdentity = getPlayerNumberIdentity(normalizedNumber);
  const numberExists =
    numberIdentity !== null &&
    roster.some((p) => p.id !== player.id && getPlayerNumberIdentity(p.number) === numberIdentity);

  const saveDisabled = nameExists || numberExists || !name.trim();

  const handleDismiss = () => {
    router.dismissTo('/EditRoster');
  };

  const handleActiveChange = (nextIsActive: boolean) => {
    setIsActive(nextIsActive);
    setSaveError(null);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || nameExists || numberExists) return;

    const updateResult = updateRosterPlayer(player.id, {
      isActive,
      matchingType,
      number: normalizedNumber,
      role,
    });
    if (updateResult === 'blocked-current-game-participation') {
      setIsActive(true);
      setSaveError(
        'Players who already appeared in the current game cannot be set inactive until the game is over.',
      );
      return;
    }
    if (updateResult !== 'updated') return;
    setSaveError(null);

    const latestTeam = useGameStore.getState().currentTeam;
    if (!latestTeam) return;

    const updatedRoster = latestTeam.roster.map((p) =>
      p.id === player.id
        ? {
            ...p,
            name: trimmedName,
            number: normalizedNumber || undefined,
          }
        : p,
    );
    const updatedTeam = { ...latestTeam, roster: updatedRoster };
    setCurrentTeam(updatedTeam);
    await saveCurrentTeam(updatedTeam);
    router.dismissTo('/EditRoster');
  };

  const handleNumberChange = (value: string) => {
    setNumber(normalizePlayerNumber(value));
  };

  const handleDelete = async () => {
    if (hasCurrentGameStats || hasPlayerRecordedActionsInActiveAdvancedGame(playerId)) {
      setSaveError(
        'Players who already appeared in the current game cannot be deleted until the game is over.',
      );
      setConfirmingDelete(false);
      return;
    }

    // Actually delete
    const newRoster = roster.filter((p) => p.id !== playerId);
    setCurrentTeam({ ...currentTeam, roster: newRoster });
    removePlayerFromPresets(playerId);
    await saveCurrentTeam();
    router.dismissTo('/EditRoster');
  };

  // Check for stats
  const hasCurrentGameStats = hasPlayerRecordedStats(playerId, events);
  const hasAdvancedGameParticipation = hasPlayerRecordedActionsInActiveAdvancedGame(playerId);
  const hasStatsInSavedGames = hasPlayerRecordedStatsInSavedGames(playerId, savedGames);

  return (
    <KeyboardAvoidingView automaticOffset style={styles.keyboardAvoidingView} behavior="height">
      <BottomSheet
        onDismiss={handleDismiss}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        minBottomPadding={16}>
        <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
        {confirmingDelete ? (
          // In-sheet delete confirmation view
          <View style={styles.confirmContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={scaleBySizeClass(44, sizeClass)}
              color={palette.danger}
            />
            <ThemedText style={[styles.confirmTitle, { color: palette.modalText }]}>
              Delete {player.name}?
            </ThemedText>
            <ThemedText style={[styles.confirmMessage, { color: palette.modalTextMuted }]}>
              {hasStatsInSavedGames
                ? 'This player has stats in saved games. This action cannot be undone.'
                : 'This action cannot be undone.'}
            </ThemedText>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                  styles.confirmCancelButton,
                ]}
                onPress={() => setConfirmingDelete(false)}>
                <ThemedText style={[styles.confirmButtonText, { color: palette.modalText }]}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: palette.danger }]}
                onPress={handleDelete}>
                <ThemedText style={[styles.confirmButtonText, { color: palette.textOnAccent }]}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          // Normal edit view
          <>
            <View style={styles.headerRow}>
              <ThemedText style={[styles.headerTitle, { color: palette.modalText }]}>
                Edit Player
              </ThemedText>
              <Pressable
                onPress={handleDismiss}
                hitSlop={12}
                accessibilityLabel="Close"
                accessibilityRole="button">
                <MaterialCommunityIcons
                  name="close"
                  size={scaleBySizeClass(22, sizeClass)}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {/* Name and Number inputs row */}
              <View style={styles.inputsRow}>
                <View style={styles.nameField}>
                  <ThemedText style={[styles.fieldLabel, { color: palette.modalTextMuted }]}>
                    PLAYER NAME
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: nameExists ? palette.danger : palette.overlay20,
                        color: palette.modalText,
                        backgroundColor: palette.overlay05,
                      },
                    ]}
                    placeholder="Player name..."
                    placeholderTextColor={palette.modalTextMuted}
                    value={name}
                    onChangeText={setName}
                    maxLength={20}
                    autoCapitalize="words"
                  />
                  {nameExists && (
                    <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                      A player with this name already exists
                    </ThemedText>
                  )}
                </View>

                <View style={styles.numberField}>
                  <ThemedText style={[styles.fieldLabel, { color: palette.modalTextMuted }]}>
                    NUMBER
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      styles.numberInput,
                      {
                        borderColor: numberExists ? palette.danger : palette.overlay20,
                        color: palette.modalText,
                        backgroundColor: palette.overlay05,
                      },
                    ]}
                    placeholder="#"
                    placeholderTextColor={palette.modalTextMuted}
                    value={number}
                    onChangeText={handleNumberChange}
                    keyboardType="number-pad"
                    maxLength={MAX_PLAYER_NUMBER_LENGTH}
                  />
                  {numberExists && (
                    <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                      Already in use
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Active Toggle */}
              {!hasAdvancedGameParticipation && (
                <View style={[styles.sectionRow, styles.activeRow]}>
                  <View style={styles.activeTextContainer}>
                    <ThemedText style={[styles.sectionLabel, { color: palette.modalText }]}>
                      Active roster
                    </ThemedText>
                    <ThemedText style={[styles.activeSubtext, { color: palette.modalTextMuted }]}>
                      Available for games and line presets
                    </ThemedText>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={handleActiveChange}
                    trackColor={{ false: palette.overlay20, true: palette.accent }}
                    thumbColor={isActive ? palette.textOnAccent : palette.modalTextMuted}
                    testID="edit-player-active-toggle"
                  />
                </View>
              )}

              {saveError && (
                <ThemedText
                  accessibilityRole="alert"
                  testID="edit-player-save-error"
                  style={[styles.errorText, { color: palette.danger }]}>
                  {saveError}
                </ThemedText>
              )}

              {/* Matching Preference */}
              <View style={styles.sectionRow}>
                <ThemedText style={[styles.sectionLabel, { color: palette.modalText }]}>
                  Matching preference
                </ThemedText>
                <View style={styles.pillRow}>
                  <Pressable
                    style={[
                      styles.pill,
                      { borderColor: palette.overlay20 },
                      matchingType === 'fmp' && {
                        backgroundColor: fmpColor,
                        borderColor: fmpColor,
                      },
                    ]}
                    onPress={() => setMatchingType(matchingType === 'fmp' ? null : 'fmp')}>
                    <ThemedText
                      style={[
                        styles.pillText,
                        {
                          color:
                            matchingType === 'fmp' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      FMP
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pill,
                      { borderColor: palette.overlay20 },
                      matchingType === 'mmp' && {
                        backgroundColor: mmpColor,
                        borderColor: mmpColor,
                      },
                    ]}
                    onPress={() => setMatchingType(matchingType === 'mmp' ? null : 'mmp')}>
                    <ThemedText
                      style={[
                        styles.pillText,
                        {
                          color:
                            matchingType === 'mmp' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      MMP
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Role */}
              <View style={styles.sectionRow}>
                <ThemedText style={[styles.sectionLabel, { color: palette.modalText }]}>
                  Role
                </ThemedText>
                <View style={styles.pillRow}>
                  <Pressable
                    style={[
                      styles.pill,
                      styles.pillWithIcon,
                      { borderColor: palette.overlay20 },
                      role === 'handler' && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
                      },
                    ]}
                    onPress={() => setRole(role === 'handler' ? null : 'handler')}>
                    <MaterialCommunityIcons
                      name="bullseye-arrow"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={role === 'handler' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <ThemedText
                      style={[
                        styles.pillText,
                        {
                          color: role === 'handler' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Handler
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pill,
                      styles.pillWithIcon,
                      { borderColor: palette.overlay20 },
                      role === 'hybrid' && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
                      },
                    ]}
                    onPress={() => setRole(role === 'hybrid' ? null : 'hybrid')}>
                    <MaterialCommunityIcons
                      name="star-three-points"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={role === 'hybrid' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <ThemedText
                      style={[
                        styles.pillText,
                        {
                          color: role === 'hybrid' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Hybrid
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pill,
                      styles.pillWithIcon,
                      { borderColor: palette.overlay20 },
                      role === 'cutter' && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
                      },
                    ]}
                    onPress={() => setRole(role === 'cutter' ? null : 'cutter')}>
                    <MaterialCommunityIcons
                      name="shoe-print"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={role === 'cutter' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <ThemedText
                      style={[
                        styles.pillText,
                        {
                          color: role === 'cutter' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Cutter
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                {!hasCurrentGameStats && !hasAdvancedGameParticipation && (
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: palette.dangerOverlay15 }]}
                    onPress={() => setConfirmingDelete(true)}
                    accessibilityLabel="Delete player"
                    testID="edit-player-delete">
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={scaleBySizeClass(20, sizeClass)}
                      color={palette.danger}
                    />
                  </Pressable>
                )}
                <View style={styles.actionButtons}>
                  <Pressable
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { backgroundColor: 'transparent', borderColor: palette.overlay20 },
                    ]}
                    onPress={handleDismiss}>
                    <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.button,
                      {
                        backgroundColor: saveDisabled ? palette.overlay20 : palette.accent,
                      },
                    ]}
                    onPress={handleSave}
                    disabled={saveDisabled}
                    testID="edit-player-save">
                    <ThemedText
                      style={[
                        styles.buttonText,
                        {
                          color: saveDisabled ? palette.modalTextMuted : palette.textOnAccent,
                        },
                      ]}>
                      Save
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </>
        )}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function createStyles(sizeClass: SizeClass) {
  const isTablet = sizeClass !== 'small';

  return StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    sheet: {
      width: '100%',
      maxHeight: '92%',
      paddingTop: 10,
      ...(isTablet && {
        maxWidth: getSizeClassValue(MODAL_MAX_WIDTH_FORM, sizeClass),
        alignSelf: 'center',
      }),
    },
    handle: {
      width: scaleBySizeClass(36, sizeClass),
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    scrollArea: {
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    inputsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
    },
    nameField: {
      flex: 1,
    },
    numberField: {
      width: scaleBySizeClass(88, sizeClass),
    },
    fieldLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: scaleBySizeClass(16, sizeClass),
    },
    numberInput: {
      textAlign: 'center',
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginTop: 4,
      marginLeft: 2,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    activeRow: {
      paddingVertical: 2,
    },
    activeTextContainer: {
      flex: 1,
      marginRight: 12,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    activeSubtext: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginTop: 2,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      minWidth: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillWithIcon: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 10,
      minWidth: 0,
    },
    pillText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      gap: 12,
    },
    deleteButton: {
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtons: {
      flex: 1,
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      borderWidth: 1,
    },
    buttonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    // Confirmation styles
    confirmContainer: {
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    confirmTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 12,
      marginBottom: 8,
      textAlign: 'center',
    },
    confirmMessage: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
    confirmButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmCancelButton: {
      borderWidth: 1,
    },
    confirmButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
