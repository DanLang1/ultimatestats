import type { MaterialDesignIconsIconName } from '@react-native-vector-icons/material-design-icons/static';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  formatPointDifferential,
  formatRecord,
  GameListItem,
  isScrimmage,
} from '@/lib/gameListUtils';
import { getSelectionActionBlocks } from '@/lib/savedGamesListUtils';
import { Fonts } from '@/theme/theme';

interface SavedGamesSelectBarProps {
  /** One team's games; the bar hides when empty. */
  selectedGames: GameListItem[];
  onViewStats: () => void;
  onAddToTournament: () => void;
  onShare: () => void;
  onDelete: () => void;
}

interface BlockedAlert {
  title: string;
  message: string;
}

interface SelectBarAction {
  label: string;
  /** The alert explaining why the selection can't run this action, or null when it can. */
  blockedAlert: BlockedAlert | null;
  onPress: () => void;
}

function toBlockedAlert(title: string, reason: string | null): BlockedAlert | null {
  return reason == null ? null : { title, message: reason };
}

/**
 * Docked under the Saved Games list while games are selected: the selection's record, then the
 * actions on it. An action the selection can't run stays pressable and explains why.
 */
export default function SavedGamesSelectBar({
  selectedGames,
  onViewStats,
  onAddToTournament,
  onShare,
  onDelete,
}: SavedGamesSelectBarProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();

  if (selectedGames.length === 0) return null;

  const blocks = getSelectionActionBlocks(selectedGames);
  const selectionSummary = `${selectedGames.length} selected · ${formatRecord(selectedGames)}`;
  const hasScoredGames = selectedGames.some((game) => !isScrimmage(game));

  const viewStatsAction: SelectBarAction = {
    label: 'View stats',
    blockedAlert: toBlockedAlert("Can't combine these games", blocks.viewStats),
    onPress: onViewStats,
  };
  const tournamentAction: SelectBarAction = {
    label: 'Add to tournament',
    blockedAlert: toBlockedAlert("Can't add these games", blocks.addToTournament),
    onPress: onAddToTournament,
  };
  // Share and delete are familiar enough to stay icons beside the count.
  const iconActions: (SelectBarAction & {
    key: string;
    icon: MaterialDesignIconsIconName;
    color: string;
  })[] = [
    {
      key: 'share',
      label: 'Share games',
      icon: 'share-variant',
      color: palette.accent,
      blockedAlert: toBlockedAlert("Can't share these games", blocks.share),
      onPress: onShare,
    },
    {
      key: 'delete',
      label: 'Delete games',
      icon: 'delete-outline',
      color: palette.danger,
      blockedAlert: null,
      onPress: onDelete,
    },
  ];

  const handlePress = (action: SelectBarAction) => {
    if (action.blockedAlert != null) {
      showAlert(action.blockedAlert);
      return;
    }
    action.onPress();
  };

  return (
    <View
      testID="saved-games-select-bar"
      style={[styles.bar, { backgroundColor: palette.primary, borderTopColor: palette.overlay08 }]}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryTextRow}>
          <ThemedText
            style={[styles.summaryText, { color: palette.textInverse }]}
            numberOfLines={1}>
            {selectionSummary}
          </ThemedText>
          {hasScoredGames && (
            <ThemedText style={[styles.diffText, { color: palette.textMuted }]} numberOfLines={1}>
              {`· ${formatPointDifferential(selectedGames)} point diff`}
            </ThemedText>
          )}
        </View>
        {iconActions.map((action) => (
          <Pressable
            key={action.key}
            testID={`saved-games-select-bar-${action.key}`}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.blockedAlert?.message}
            hitSlop={4}
            onPress={() => handlePress(action)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
              action.blockedAlert != null && styles.blocked,
            ]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={scaleBySizeClass(22, sizeClass)}
              color={action.color}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          testID="saved-games-select-bar-view-stats"
          accessibilityRole="button"
          accessibilityHint={viewStatsAction.blockedAlert?.message}
          onPress={() => handlePress(viewStatsAction)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.accent },
            pressed && styles.pressed,
            viewStatsAction.blockedAlert != null && styles.blocked,
          ]}>
          <ThemedText
            style={[styles.buttonText, { color: palette.textOnAccent }]}
            numberOfLines={1}>
            {viewStatsAction.label}
          </ThemedText>
        </Pressable>
        <Pressable
          testID="saved-games-select-bar-add-to-tournament"
          accessibilityRole="button"
          accessibilityLabel={tournamentAction.label}
          accessibilityHint={tournamentAction.blockedAlert?.message}
          onPress={() => handlePress(tournamentAction)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.overlay05 },
            pressed && styles.pressed,
            tournamentAction.blockedAlert != null && styles.blocked,
          ]}>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.accent}
          />
          <ThemedText
            style={[styles.buttonText, styles.buttonTextShrinkable, { color: palette.accent }]}
            numberOfLines={1}
            // Shrinks to fit narrow phones; very large text sizes may still truncate it.
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {tournamentAction.label}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  const buttonSize = scaleBySizeClass(44, sizeClass);
  return StyleSheet.create({
    bar: {
      gap: scaleBySizeClass(10, sizeClass),
      borderTopWidth: 1,
      paddingVertical: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: isLandscape ? 14 : 16,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    // Takes the width the icons leave, so the summary truncates before pushing them off.
    summaryTextRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    summaryText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      fontVariant: ['tabular-nums'],
    },
    // Shrinks first, so the point diff truncates before the record.
    diffText: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    actionRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      height: buttonSize,
      borderRadius: 10,
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      gap: scaleBySizeClass(6, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonTextShrinkable: {
      flexShrink: 1,
    },
    iconButton: {
      width: scaleBySizeClass(40, sizeClass),
      height: scaleBySizeClass(40, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    blocked: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
