import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatTournamentDateRange } from '@/lib/dateUtils';
import { reportError } from '@/lib/sentry';
import { Tournament, TournamentKind } from '@/lib/storage/types';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

interface TournamentPickerModalProps {
  visible: boolean;
  gameKind: TournamentKind;
  onSelect: (tournamentId: string) => void;
  onClose: () => void;
  /** Games a newly created tournament should start with. */
  gameIds: string[];
}

export function TournamentPickerModal({
  visible,
  gameKind,
  gameIds,
  onSelect,
  onClose,
}: TournamentPickerModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();
  const { tournaments, deleteTournament } = useTournamentStore();
  // The alert provider's modal can't present over this one, so delete is confirmed in the sheet.
  const [pendingDelete, setPendingDelete] = useState<Tournament | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const compatibleTournaments = tournaments.filter((tournament) => {
    return tournament.kind === null || tournament.kind === gameKind;
  });

  const handleClose = () => {
    setPendingDelete(null);
    setDeleteError(null);
    onClose();
  };

  const handleSelectTournament = (tournament: Tournament) => {
    onSelect(tournament.id);
    handleClose();
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (tournament: Tournament) => {
    try {
      await deleteTournament(tournament.id);
      handleCancelDelete();
    } catch (error) {
      reportError('tournament-delete', error);
      setDeleteError('Could not delete the tournament. Try again.');
    }
  };

  const handleCreateNew = () => {
    handleClose();
    router.push({
      pathname: '/create-tournament',
      params: { gameKind, gameIds: gameIds.join(',') },
    });
  };

  const iconSize = scaleBySizeClass(20, sizeClass);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Pressable
          style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
          onPress={handleClose}>
          <Pressable
            style={[
              styles.bottomSheet,
              {
                backgroundColor: palette.modalBg,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
            </View>

            {pendingDelete ? (
              <View style={styles.confirmContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={scaleBySizeClass(44, sizeClass)}
                  color={palette.danger}
                />
                <ThemedText style={[styles.confirmTitle, { color: palette.modalText }]}>
                  Delete {pendingDelete.name}?
                </ThemedText>
                <ThemedText style={[styles.confirmMessage, { color: palette.modalTextMuted }]}>
                  {deleteError ?? 'Its games stay saved.'}
                </ThemedText>
                <View style={styles.confirmButtons}>
                  <Pressable
                    style={[
                      styles.confirmButton,
                      { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                      styles.confirmCancelButton,
                    ]}
                    onPress={handleCancelDelete}>
                    <ThemedText style={[styles.confirmButtonText, { color: palette.modalText }]}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmButton, { backgroundColor: palette.danger }]}
                    onPress={() => handleConfirmDelete(pendingDelete)}>
                    <ThemedText style={[styles.confirmButtonText, { color: palette.textOnAccent }]}>
                      Delete tournament
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <ThemedText style={[styles.title, { color: palette.modalText }]}>
                  Select Tournament
                </ThemedText>

                <ScrollView bounces={false}>
                  <Pressable
                    style={[styles.row, { borderBottomColor: palette.overlay10 }]}
                    onPress={handleCreateNew}>
                    <MaterialCommunityIcons name="plus" size={iconSize} color={palette.accent} />
                    <ThemedText style={[styles.rowText, { color: palette.accent }]}>
                      Create New Tournament
                    </ThemedText>
                  </Pressable>

                  {compatibleTournaments.map((tournament) => (
                    <Pressable
                      key={tournament.id}
                      style={[styles.row, { borderBottomColor: palette.overlay10 }]}
                      onPress={() => handleSelectTournament(tournament)}>
                      <MaterialCommunityIcons
                        name="trophy-outline"
                        size={iconSize}
                        color={palette.modalTextMuted}
                      />
                      <View style={styles.tournamentInfo}>
                        <ThemedText style={[styles.rowText, { color: palette.modalText }]}>
                          {tournament.name}
                        </ThemedText>
                        <ThemedText style={[styles.dateText, { color: palette.modalTextMuted }]}>
                          {formatTournamentDateRange(tournament.startDate, tournament.endDate)}
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${tournament.name}`}
                        hitSlop={8}
                        onPress={() => setPendingDelete(tournament)}>
                        <MaterialCommunityIcons
                          name="delete-outline"
                          size={scaleBySizeClass(18, sizeClass)}
                          color={palette.modalTextMuted}
                        />
                      </Pressable>
                    </Pressable>
                  ))}

                  {compatibleTournaments.length === 0 && (
                    <ThemedText style={[styles.emptyText, { color: palette.modalTextMuted }]}>
                      No tournaments yet
                    </ThemedText>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      maxHeight: '75%',
      width: getSizeClassValue({ small: '100%', medium: '75%', large: '60%' }, sizeClass),
      alignSelf: 'center',
    },
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
    },
    title: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tournamentInfo: {
      flex: 1,
    },
    rowText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    dateText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: 2,
    },
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
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}
