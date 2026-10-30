import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatPointDifferential, formatRecord, GameListItem } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface AggregateBottomBarProps {
  selectedGames: GameListItem[];
  onViewStats: () => void;
  onAddToTournament: () => void;
  showShare: boolean;
  onShare: () => void;
  isVisible: boolean;
}

/** Docked under the game picker: the selection's record, then the actions on it. */
export default function AggregateBottomBar({
  selectedGames,
  onViewStats,
  onAddToTournament,
  showShare,
  onShare,
  isVisible,
}: AggregateBottomBarProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  if (!isVisible || selectedGames.length === 0) return null;

  const record = formatRecord(selectedGames);
  const selectionSummary = `${selectedGames.length} selected${record != null ? ` · ${record}` : ''}`;

  return (
    <View
      style={[styles.bar, { backgroundColor: palette.primary, borderTopColor: palette.overlay08 }]}>
      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryText, { color: palette.textInverse }]} numberOfLines={1}>
          {selectionSummary}
        </ThemedText>
        <ThemedText style={[styles.diffText, { color: palette.textMuted }]} numberOfLines={1}>
          {`· ${formatPointDifferential(selectedGames)} point diff`}
        </ThemedText>
        {showShare && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share games"
            hitSlop={12}
            onPress={onShare}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons
              name="share-variant"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.accent}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onAddToTournament}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: palette.accentOverlay15 },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.actionText, { color: palette.accent }]} numberOfLines={1}>
            Add to tournament
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onViewStats}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: palette.accent },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            style={[styles.actionText, { color: palette.textOnAccent }]}
            numberOfLines={1}>
            View stats
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    bar: {
      gap: scaleBySizeClass(10, sizeClass),
      borderTopWidth: 1,
      paddingVertical: scaleBySizeClass(10, sizeClass),
      // Matches the aggregate screen's content padding so the bar lines up with the list.
      paddingHorizontal: isLandscape ? 14 : 24,
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
    shareButton: {
      paddingLeft: scaleBySizeClass(8, sizeClass),
    },
    // Paired actions share one width.
    actionRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
    },
    actionButton: {
      flex: 1,
      height: scaleBySizeClass(44, sizeClass),
      borderRadius: 10,
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
