import { useTheme } from '@/context/ThemeContext';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

export default function EditPlayerModal() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { palette } = useTheme();
  const { currentTeam, setCurrentTeam, saveCurrentTeam, events, savedGames } = useGameStore();

  const { removePlayerFromPresets } = useLinePresetsStore();

  const roster = currentTeam?.roster ?? [];
  const player = roster.find((p) => p.id === playerId);

  // Initialize state from player
  const [name, setName] = useState(player?.name ?? '');
  const [isActive, setIsActive] = useState(player?.isActive ?? true);
  const [matchingType, setMatchingType] = useState<MatchingType | null>(
    player?.matchingType ?? null,
  );
  const [role, setRole] = useState<PlayerRole | null>(player?.role ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Declaratively redirect if player not found (after delete or invalid ID)
  if (!player || !currentTeam) {
    return <Redirect href="/EditRoster" />;
  }

  // Check if name already exists (excluding current player)
  const nameExists =
    name.trim() !== '' &&
    roster.some((p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== player.id);

  const handleDismiss = () => {
    router.dismissTo('/EditRoster');
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || nameExists) return;

    // If player is becoming inactive, remove from presets
    if (player.isActive && !isActive) {
      removePlayerFromPresets(player.id);
    }

    const updatedRoster = roster.map((p) =>
      p.id === player.id
        ? {
            ...p,
            name: trimmedName,
            isActive,
            matchingType,
            role,
          }
        : p,
    );
    setCurrentTeam({ ...currentTeam, roster: updatedRoster });
    saveCurrentTeam();
    router.dismissTo('/EditRoster');
  };

  const handleDelete = () => {
    // Can't delete if player has stats (check is at component level for UI)
    if (hasCurrentGameStats) {
      return;
    }

    // Actually delete
    const newRoster = roster.filter((p) => p.id !== playerId);
    setCurrentTeam({ ...currentTeam, roster: newRoster });
    removePlayerFromPresets(playerId);
    saveCurrentTeam();
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
                size={48}
                color={palette.danger}
              />
              <Text style={[styles.confirmTitle, { color: palette.modalText }]}>
                Delete {player.name}?
              </Text>
              <Text style={[styles.confirmMessage, { color: palette.modalTextMuted }]}>
                {hasStatsInSavedGames
                  ? 'This player has stats in saved games. This action cannot be undone.'
                  : 'This action cannot be undone.'}
              </Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  style={[
                    styles.confirmButton,
                    { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                    styles.confirmCancelButton,
                  ]}
                  onPress={() => setConfirmingDelete(false)}>
                  <Text style={[styles.confirmButtonText, { color: palette.modalText }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmButton, { backgroundColor: palette.danger }]}
                  onPress={handleDelete}>
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // Normal edit view
            <>
              <Text style={[styles.title, { color: palette.modalTextMuted }]}>EDIT PLAYER</Text>

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
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  A player with this name already exists
                </Text>
              )}

              {/* Active Toggle */}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: palette.modalText }]}>
                  Active roster
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: palette.overlay20, true: palette.accent }}
                  thumbColor={isActive ? palette.textOnAccent : palette.modalTextMuted}
                />
              </View>

              {/* Matching Type */}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: palette.modalText }]}>
                  Matching preference
                </Text>
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
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            matchingType === 'fmp' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      FMP
                    </Text>
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
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            matchingType === 'mmp' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      MMP
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Role */}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: palette.modalText }]}>Role</Text>
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
                      size={14}
                      color={role === 'handler' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: role === 'handler' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Handler
                    </Text>
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
                      size={14}
                      color={role === 'hybrid' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: role === 'hybrid' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Hybrid
                    </Text>
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
                      size={14}
                      color={role === 'cutter' ? palette.textOnAccent : palette.modalTextMuted}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: role === 'cutter' ? palette.textOnAccent : palette.modalTextMuted,
                        },
                      ]}>
                      Cutter
                    </Text>
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
                      size={20}
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
                    <Text style={[styles.buttonText, { color: palette.modalText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.button,
                      { backgroundColor: nameExists ? palette.overlay20 : palette.accent },
                    ]}
                    onPress={handleSave}
                    disabled={nameExists}>
                    <Text
                      style={[
                        styles.buttonText,
                        { color: nameExists ? palette.modalTextMuted : palette.textOnAccent },
                      ]}>
                      Save
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '500',
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
    gap: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '600',
  },
  // Confirmation styles
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
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
    fontSize: 15,
    fontWeight: '600',
  },
});
