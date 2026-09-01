import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Tournament } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface TournamentFilterModalProps {
  visible: boolean;
  tournaments: Tournament[];
  gameCounts: Map<string, number>;
  selectedTournamentId: string | null;
  onSelect: (tournamentId: string | null) => void;
  onClose: () => void;
}

export function TournamentFilterModal({
  visible,
  tournaments,
  gameCounts,
  selectedTournamentId,
  onSelect,
  onClose,
}: TournamentFilterModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();
  const iconSize = scaleBySizeClass(20, sizeClass);

  const handleSelect = (tournamentId: string | null) => {
    onSelect(tournamentId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
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

            <ThemedText style={[styles.title, { color: palette.modalText }]}>
              Filter by Tournament
            </ThemedText>

            <ScrollView bounces={false}>
              {/* Show All option */}
              <Pressable
                style={[styles.row, { borderBottomColor: palette.overlay10 }]}
                onPress={() => handleSelect(null)}>
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={iconSize}
                  color={selectedTournamentId === null ? palette.accent : palette.modalTextMuted}
                />
                <ThemedText
                  style={[
                    styles.rowText,
                    { color: selectedTournamentId === null ? palette.accent : palette.modalText },
                  ]}>
                  All Games
                </ThemedText>
                {selectedTournamentId === null && (
                  <MaterialCommunityIcons name="check" size={iconSize} color={palette.accent} />
                )}
              </Pressable>

              {/* Tournament list */}
              {tournaments.map((tournament) => {
                const isActive = tournament.id === selectedTournamentId;
                const count = gameCounts.get(tournament.id) ?? 0;

                return (
                  <Pressable
                    key={tournament.id}
                    style={[styles.row, { borderBottomColor: palette.overlay10 }]}
                    onPress={() => handleSelect(tournament.id)}>
                    <MaterialCommunityIcons
                      name={isActive ? 'trophy' : 'trophy-outline'}
                      size={iconSize}
                      color={isActive ? palette.accent : palette.modalTextMuted}
                    />
                    <View style={styles.tournamentInfo}>
                      <ThemedText
                        style={[
                          styles.rowText,
                          { color: isActive ? palette.accent : palette.modalText },
                        ]}>
                        {tournament.name}
                      </ThemedText>
                      <ThemedText style={[styles.countText, { color: palette.modalTextMuted }]}>
                        {count} game{count !== 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                    {isActive && (
                      <MaterialCommunityIcons name="check" size={iconSize} color={palette.accent} />
                    )}
                  </Pressable>
                );
              })}

              {tournaments.length === 0 && (
                <ThemedText style={[styles.emptyText, { color: palette.modalTextMuted }]}>
                  No tournaments with saved games
                </ThemedText>
              )}
            </ScrollView>
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
    countText: {
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
