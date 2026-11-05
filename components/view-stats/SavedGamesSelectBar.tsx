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
  const viewStatsBlockedAlert = toBlockedAlert("Can't combine these games", blocks.viewStats);
  const hasScoredGames = selectedGames.some((game) => !isScrimmage(game));

  const iconActions: {
    key: string;
    icon: MaterialDesignIconsIconName;
    label: string;
    color: string;
    /** The alert explaining why the selection can't run this action, or null when it can. */
    blockedAlert: BlockedAlert | null;
    onPress: () => void;
  }[] = [
    {
      key: 'add-to-tournament',
      icon: 'trophy-outline',
      label: 'Add to tournament',
      color: palette.accent,
      blockedAlert: toBlockedAlert("Can't add these games", blocks.addToTournament),
      onPress: onAddToTournament,
    },
    {
      key: 'share',
      icon: 'share-variant',
      label: 'Share games',
      color: palette.accent,
      blockedAlert: toBlockedAlert("Can't share these games", blocks.share),
      onPress: onShare,
    },
    {
      key: 'delete',
      icon: 'delete-outline',
      label: 'Delete games',
      color: palette.danger,
      blockedAlert: null,
      onPress: onDelete,
    },
  ];

  return (
    <View
      testID="saved-games-select-bar"
      style={[styles.bar, { backgroundColor: palette.primary, borderTopColor: palette.overlay08 }]}>
      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryText, { color: palette.textInverse }]} numberOfLines={1}>
          {selectionSummary}
        </ThemedText>
        {hasScoredGames && (
          <ThemedText style={[styles.diffText, { color: palette.textMuted }]} numberOfLines={1}>
            {`· ${formatPointDifferential(selectedGames)} point diff`}
          </ThemedText>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          testID="saved-games-select-bar-view-stats"
          accessibilityRole="button"
          accessibilityHint={viewStatsBlockedAlert?.message}
          onPress={() => {
            if (viewStatsBlockedAlert != null) {
              showAlert(viewStatsBlockedAlert);
              return;
            }
            onViewStats();
          }}
          style={({ pressed }) => [
            styles.viewStatsButton,
            { backgroundColor: palette.accent },
            pressed && styles.pressed,
            viewStatsBlockedAlert != null && styles.blocked,
          ]}>
          <ThemedText
            style={[styles.viewStatsText, { color: palette.textOnAccent }]}
            numberOfLines={1}>
            View stats
          </ThemedText>
        </Pressable>
        {iconActions.map((action) => (
          <Pressable
            key={action.key}
            testID={`saved-games-select-bar-${action.key}`}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.blockedAlert?.message}
            onPress={() => {
              if (action.blockedAlert != null) {
                showAlert(action.blockedAlert);
                return;
              }
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.overlay05 },
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
    summaryText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      fontVariant: ['tabular-nums'],
    },
    // Takes the leftover width so the point diff truncates before the record.
    diffText: {
      flex: 1,
      fontSize: scaleBySizeClass(14, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    // Icon actions sit at the end; View stats, when shown, takes the rest of the row.
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: scaleBySizeClass(8, sizeClass),
    },
    viewStatsButton: {
      flex: 1,
      height: buttonSize,
      borderRadius: 10,
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewStatsText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    iconButton: {
      width: buttonSize,
      height: buttonSize,
      borderRadius: 10,
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
