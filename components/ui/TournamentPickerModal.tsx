import { useAlert } from '@/components/ui/AlertProvider';
import { formatISODateForDisplay } from '@/lib/dateUtils';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Tournament } from '@/lib/storage/types';
import { useTournamentStore } from '@/store/tournamentStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface TournamentPickerModalProps {
  visible: boolean;
  onSelect: (tournamentId: string) => void;
  onClose: () => void;
}

export function TournamentPickerModal({ visible, onSelect, onClose }: TournamentPickerModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { tournaments, deleteTournament } = useTournamentStore();
  const { clearTournamentFromGames } = useGameStore();

  const handleSelectTournament = (tournament: Tournament) => {
    onSelect(tournament.id);
    onClose();
  };

  const handleDeleteTournament = (tournament: Tournament) => {
    showAlert({
      title: 'Delete Tournament?',
      message: `Are you sure you want to delete "${tournament.name}"? Games will not be deleted.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTournament(tournament.id);
            } catch {
              showAlert({
                title: 'Delete failed',
                message: 'Could not delete the tournament. Please try again.',
              });
              return;
            }
            try {
              await clearTournamentFromGames(tournament.id);
            } catch {
              showAlert({
                title: 'Cleanup failed',
                message:
                  'Tournament deleted, but some games may still reference it. Please reload the app.',
              });
            }
          },
        },
      ],
    });
  };

  const handleCreateNew = () => {
    onClose();
    router.push('/CreateTournament');
  };

  const iconSize = scaleBySizeClass(20, sizeClass);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Pressable
          style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
          onPress={onClose}>
          <Pressable
            style={[
              styles.bottomSheet,
              {
                backgroundColor: palette.modalBg,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: palette.modalText }]}>Select Tournament</Text>

            <ScrollView bounces={false}>
              {/* Create new option */}
              <Pressable
                style={[styles.row, { borderBottomColor: palette.overlay10 }]}
                onPress={handleCreateNew}>
                <MaterialCommunityIcons name="plus" size={iconSize} color={palette.accent} />
                <Text style={[styles.rowText, { color: palette.accent }]}>
                  Create New Tournament
                </Text>
              </Pressable>

              {/* Existing tournaments */}
              {tournaments.map((tournament) => (
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
                    <Text style={[styles.rowText, { color: palette.modalText }]}>
                      {tournament.name}
                    </Text>
                    <Text style={[styles.dateText, { color: palette.modalTextMuted }]}>
                      {formatDateRange(tournament.startDate, tournament.endDate)}
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => handleDeleteTournament(tournament)}>
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={scaleBySizeClass(18, sizeClass)}
                      color={palette.modalTextMuted}
                    />
                  </Pressable>
                </Pressable>
              ))}

              {tournaments.length === 0 && (
                <Text style={[styles.emptyText, { color: palette.modalTextMuted }]}>
                  No tournaments yet
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatISODateForDisplay(start);
  return `${formatISODateForDisplay(start)} – ${formatISODateForDisplay(end)}`;
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
      fontWeight: '700',
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
      fontWeight: '600',
    },
    dateText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: 2,
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}
