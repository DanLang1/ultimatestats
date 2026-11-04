import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  SAVED_GAMES_SORT_OPTIONS,
  SavedGamesSortKey,
  TournamentSummary,
} from '@/lib/savedGamesListUtils';
import { Fonts } from '@/theme/theme';

const SORT_OPTION_LIST = Object.values(SAVED_GAMES_SORT_OPTIONS);

interface SavedGamesSortSheetProps {
  visible: boolean;
  selectedKey: SavedGamesSortKey;
  onSelect: (key: SavedGamesSortKey) => void;
  /** In display order; the tournament section is hidden when empty. */
  tournamentOptions: TournamentSummary[];
  selectedTournamentId: string | null;
  onSelectTournament: (tournamentId: string | null) => void;
  onClose: () => void;
}

/** Sorts the saved games list and filters it to one tournament. */
export function SavedGamesSortSheet({
  visible,
  selectedKey,
  onSelect,
  tournamentOptions,
  selectedTournamentId,
  onSelectTournament,
  onClose,
}: SavedGamesSortSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleSelect = (key: SavedGamesSortKey) => {
    onSelect(key);
    onClose();
  };

  const handleSelectTournament = (tournamentId: string | null) => {
    onSelectTournament(tournamentId);
    onClose();
  };

  const tournamentRows = [
    { id: null, name: 'All tournaments', gameCount: null },
    ...tournamentOptions.map(({ tournament, gameCount }) => ({
      id: tournament.id,
      name: tournament.name,
      gameCount,
    })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        testID="saved-games-sort-sheet"
        minBottomPadding={16}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
        <View style={styles.content}>
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
          </View>
          <ThemedText
            accessibilityRole="header"
            style={[styles.title, { color: palette.modalText }]}>
            Sort & filter
          </ThemedText>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
          <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
            Sort by
          </ThemedText>
          {SORT_OPTION_LIST.map((option) => {
            const isSelected = option.key === selectedKey;
            return (
              <Pressable
                key={option.key}
                testID={`saved-games-sort-option-${option.key}`}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelect(option.key)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: palette.overlay08 },
                ]}>
                <ThemedText
                  style={[
                    styles.rowText,
                    { color: isSelected ? palette.accent : palette.modalText },
                  ]}>
                  {option.label}
                </ThemedText>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check"
                    size={scaleBySizeClass(20, sizeClass)}
                    color={palette.accent}
                  />
                )}
              </Pressable>
            );
          })}
          {tournamentOptions.length > 0 && (
            <>
              <ThemedText
                style={[styles.sectionLabel, styles.sectionGap, { color: palette.modalTextMuted }]}>
                Tournament
              </ThemedText>
              {tournamentRows.map((option) => {
                const isSelected = option.id === selectedTournamentId;
                return (
                  <Pressable
                    key={option.id ?? 'all'}
                    testID={`saved-games-tournament-option-${option.id ?? 'all'}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      option.gameCount == null
                        ? option.name
                        : `${option.name}, ${option.gameCount} ${option.gameCount === 1 ? 'game' : 'games'}`
                    }
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelectTournament(option.id)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { backgroundColor: palette.overlay08 },
                    ]}>
                    <ThemedText
                      style={[
                        styles.rowText,
                        styles.tournamentName,
                        { color: isSelected ? palette.accent : palette.modalText },
                      ]}
                      numberOfLines={1}>
                      {option.name}
                    </ThemedText>
                    {option.gameCount != null && (
                      <ThemedText style={[styles.countText, { color: palette.modalTextMuted }]}>
                        {option.gameCount}
                      </ThemedText>
                    )}
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={scaleBySizeClass(20, sizeClass)}
                        color={palette.accent}
                      />
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      width: '100%',
      maxWidth: 640,
      maxHeight: '85%',
      alignSelf: 'center',
    },
    content: {
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    // Lets a long tournament list scroll while the title stays put.
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
    },
    sectionGap: {
      marginTop: scaleBySizeClass(16, sizeClass),
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
      marginBottom: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: scaleBySizeClass(48, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      borderRadius: 12,
    },
    rowText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    tournamentName: {
      flex: 1,
    },
    countText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontVariant: ['tabular-nums'],
    },
  });
}
