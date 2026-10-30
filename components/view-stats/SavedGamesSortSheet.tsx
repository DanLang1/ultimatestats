import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export type SavedGamesSortField = 'date' | 'team' | 'score';
export type SavedGamesSortDirection = 'asc' | 'desc';
export type SavedGamesSortKey =
  | 'newest'
  | 'oldest'
  | 'team-asc'
  | 'team-desc'
  | 'points-desc'
  | 'points-asc';

export interface SavedGamesSortOption {
  key: SavedGamesSortKey;
  field: SavedGamesSortField;
  direction: SavedGamesSortDirection;
  /** Full wording for the picker sheet. */
  label: string;
  /** Compact wording for the sort button. */
  shortLabel: string;
}

export const SAVED_GAMES_SORT_OPTIONS: Record<SavedGamesSortKey, SavedGamesSortOption> = {
  newest: {
    key: 'newest',
    field: 'date',
    direction: 'desc',
    label: 'Newest first',
    shortLabel: 'Newest',
  },
  oldest: {
    key: 'oldest',
    field: 'date',
    direction: 'asc',
    label: 'Oldest first',
    shortLabel: 'Oldest',
  },
  'team-asc': {
    key: 'team-asc',
    field: 'team',
    direction: 'asc',
    label: 'Team A–Z',
    shortLabel: 'Team A–Z',
  },
  'team-desc': {
    key: 'team-desc',
    field: 'team',
    direction: 'desc',
    label: 'Team Z–A',
    shortLabel: 'Team Z–A',
  },
  'points-desc': {
    key: 'points-desc',
    field: 'score',
    direction: 'desc',
    label: 'Highest scoring',
    shortLabel: 'High scoring',
  },
  'points-asc': {
    key: 'points-asc',
    field: 'score',
    direction: 'asc',
    label: 'Lowest scoring',
    shortLabel: 'Low scoring',
  },
};

const SORT_OPTION_LIST = Object.values(SAVED_GAMES_SORT_OPTIONS);

interface SavedGamesSortSheetProps {
  visible: boolean;
  selectedKey: SavedGamesSortKey;
  onSelect: (key: SavedGamesSortKey) => void;
  onClose: () => void;
}

export function SavedGamesSortSheet({
  visible,
  selectedKey,
  onSelect,
  onClose,
}: SavedGamesSortSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleSelect = (key: SavedGamesSortKey) => {
    onSelect(key);
    onClose();
  };

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
            Sort games
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
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    content: {
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
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
  });
}
