import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SavedGameTeam } from '@/lib/savedGamesListUtils';
import { Fonts } from '@/theme/theme';

interface SavedGamesTeamSheetProps {
  visible: boolean;
  /** In display order. */
  teams: SavedGameTeam[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onClose: () => void;
}

function formatGameCount(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}

/** Picks which team's saved games the list shows. */
export function SavedGamesTeamSheet({
  visible,
  teams,
  selectedTeamId,
  onSelectTeam,
  onClose,
}: SavedGamesTeamSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleSelectTeam = (teamId: string) => {
    onSelectTeam(teamId);
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
        testID="saved-games-team-sheet"
        minBottomPadding={16}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
        <View style={styles.content}>
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
          </View>
          <ThemedText
            accessibilityRole="header"
            style={[styles.title, { color: palette.modalText }]}>
            Team
          </ThemedText>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
          {teams.map((team) => {
            const isSelected = team.id === selectedTeamId;
            const detail = `${formatGameCount(team.gameCount)} · ${team.record}`;
            return (
              <Pressable
                key={team.id}
                testID={`saved-games-team-option-${team.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${team.name}, ${detail}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectTeam(team.id)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: palette.overlay08 },
                ]}>
                <View style={styles.rowLabels}>
                  <ThemedText
                    style={[
                      styles.rowText,
                      { color: isSelected ? palette.accent : palette.modalText },
                    ]}
                    numberOfLines={1}>
                    {team.name}
                  </ThemedText>
                  <ThemedText style={[styles.detailText, { color: palette.modalTextMuted }]}>
                    {detail}
                  </ThemedText>
                </View>
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
    // Lets a long team list scroll while the title stays put.
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
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
      minHeight: scaleBySizeClass(56, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(6, sizeClass),
      borderRadius: 12,
    },
    rowLabels: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    rowText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    detailText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontVariant: ['tabular-nums'],
    },
  });
}
