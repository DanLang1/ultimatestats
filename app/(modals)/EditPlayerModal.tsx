import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { MAX_PLAYER_NUMBER_LENGTH, MODAL_MAX_WIDTH_FORM } from '@/lib/constants';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getPlayerNumberIdentity,
  normalizePlayerNumber,
} from '@/lib/advancedTracking/voiceNumberUtils';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

export default function EditPlayerModal() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { currentTeam, setCurrentTeam, saveCurrentTeam, events, savedGames, updateRosterPlayer } =
    useGameStore();

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

  const handleDismiss = () => {
    router.dismissTo('/EditRoster');
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
      showAlert({
        title: 'Player Already Participated',
        message:
          'Players who already appeared in the current game cannot be set inactive until the game is over.',
      });
      return;
    }
    if (updateResult !== 'updated') return;

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
    // Can't delete if player has stats (check is at component level for UI)
    if (hasCurrentGameStats) {
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
  const hasCurrentGameStats = events.some((e) => {
    if (e.type === 'goal') {
      return e.goalPlayerId === playerId || e.assistPlayerId === playerId;
    }
    if (e.type === 'turnover') {
      return e.playerId === playerId || e.player2Id === playerId;
    }
    return false;
  });

  const hasStatsInSavedGames = savedGames.some((game) =>
    game.events.some((e) => {
      if (e.type === 'goal') {
        return e.goalPlayerId === playerId || e.assistPlayerId === playerId;
      }
      if (e.type === 'turnover') {
        return e.playerId === playerId || e.player2Id === playerId;
      }
      return false;
    }),
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleDismiss}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: palette.modalBg, borderColor: palette.overlay15 },
          ]}
          onPress={(e) => e.stopPropagation()}>
          {confirmingDelete ? (
            // Delete confirmation view
            <View style={styles.confirmContainer}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={scaleBySizeClass(48, sizeClass)}
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
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              <ThemedText style={[styles.title, { color: palette.modalTextMuted }]}>
                EDIT PLAYER
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
              />
              {nameExists && (
                <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                  A player with this name already exists
                </ThemedText>
              )}

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: numberExists ? palette.danger : palette.overlay20,
                    color: palette.modalText,
                    backgroundColor: palette.overlay05,
                  },
                ]}
                placeholder="Jersey number..."
                placeholderTextColor={palette.modalTextMuted}
                value={number}
                onChangeText={handleNumberChange}
                keyboardType="number-pad"
                maxLength={MAX_PLAYER_NUMBER_LENGTH}
              />
              {numberExists && (
                <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                  Another player already has this number
                </ThemedText>
              )}

              {/* Active Toggle */}
              <View style={styles.toggleRow}>
                <ThemedText style={[styles.toggleLabel, { color: palette.modalText }]}>
                  Active roster
                </ThemedText>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: palette.overlay20, true: palette.accent }}
                  thumbColor={isActive ? palette.textOnAccent : palette.modalTextMuted}
                />
              </View>

              {/* Matching Type */}
              <View style={styles.toggleRow}>
                <ThemedText style={[styles.toggleLabel, { color: palette.modalText }]}>
                  Matching preference
                </ThemedText>
                <View style={styles.pillRow}>
                  <Pressable
                    style={[
                      styles.pill,
                      { borderColor: palette.overlay20 },
                      matchingType === 'fmp' && {
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
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
                        backgroundColor: palette.accent,
                        borderColor: palette.accent,
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
              <View style={styles.toggleRow}>
                <ThemedText style={[styles.toggleLabel, { color: palette.modalText }]}>
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
                      size={scaleBySizeClass(12, sizeClass)}
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
                      size={scaleBySizeClass(12, sizeClass)}
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
                      size={scaleBySizeClass(12, sizeClass)}
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
                {!hasCurrentGameStats && (
                  <Pressable
                    style={[styles.deleteButton, { backgroundColor: palette.dangerOverlay15 }]}
                    onPress={() => setConfirmingDelete(true)}>
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
                      { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
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
                        backgroundColor:
                          nameExists || numberExists ? palette.overlay20 : palette.accent,
                      },
                    ]}
                    onPress={handleSave}
                    disabled={nameExists || numberExists}>
                    <ThemedText
                      style={[
                        styles.buttonText,
                        {
                          color:
                            nameExists || numberExists
                              ? palette.modalTextMuted
                              : palette.textOnAccent,
                        },
                      ]}>
                      Save
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    sheet: {
      width: '100%',
      maxWidth: getSizeClassValue(MODAL_MAX_WIDTH_FORM, sizeClass),
      maxHeight: '92%',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
    },
    scrollArea: {
      width: '100%',
    },
    scrollContent: {
      paddingBottom: 2,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginBottom: 16,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scaleBySizeClass(16, sizeClass),
      marginBottom: 8,
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginLeft: 4,
      marginBottom: 8,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    toggleLabel: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
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
      minWidth: 50,
      alignItems: 'center',
    },
    pillWithIcon: {
      flexDirection: 'row',
      gap: 3,
      paddingHorizontal: 8,
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
      paddingVertical: 8,
    },
    confirmTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 12,
      marginBottom: 8,
    },
    confirmMessage: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      marginBottom: 20,
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
