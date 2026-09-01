import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface AggregateBottomBarProps {
  selectedCount: number;
  onViewAggregated: () => void;
  onAddToTournament?: () => void;
  showAddToTournament?: boolean;
  onShare?: () => void;
  showShare?: boolean;
  isVisible: boolean;
}

export default function AggregateBottomBar({
  selectedCount,
  onViewAggregated,
  onAddToTournament,
  showAddToTournament = false,
  onShare,
  showShare = false,
  isVisible,
}: AggregateBottomBarProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const actionIconSize = scaleBySizeClass(20, sizeClass);
  const singleRow = isLandscape || sizeClass !== 'small';

  if (!isVisible || selectedCount === 0) return null;

  const tournamentButton = showAddToTournament && onAddToTournament && (
    <Pressable
      style={[
        styles.actionButton,
        { backgroundColor: palette.accent, shadowColor: palette.shadow },
      ]}
      onPress={onAddToTournament}>
      <MaterialCommunityIcons
        name="trophy-outline"
        size={actionIconSize}
        color={palette.textOnAccent}
      />
      <ThemedText style={[styles.actionText, { color: palette.textOnAccent }]}>
        Add to Tournament
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={styles.bottomBar}>
      {!singleRow && tournamentButton}
      <View style={styles.bottomRow}>
        {showShare && onShare && (
          <Pressable
            style={[
              styles.iconButton,
              { backgroundColor: palette.accent, shadowColor: palette.shadow },
            ]}
            onPress={onShare}>
            <MaterialCommunityIcons
              name="share-variant"
              size={actionIconSize}
              color={palette.textOnAccent}
            />
          </Pressable>
        )}
        {singleRow && tournamentButton}
        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: palette.accent, shadowColor: palette.shadow },
          ]}
          onPress={onViewAggregated}>
          <MaterialCommunityIcons
            name="chart-box"
            size={actionIconSize}
            color={palette.textOnAccent}
          />
          <ThemedText style={[styles.actionText, { color: palette.textOnAccent }]}>
            View Combined ({selectedCount} game{selectedCount !== 1 ? 's' : ''})
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    bottomBar: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      alignItems: 'flex-end',
      gap: 10,
      pointerEvents: 'box-none',
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconButton: {
      width: scaleBySizeClass(44, sizeClass),
      height: scaleBySizeClass(44, sizeClass),
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.95,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      opacity: 0.95,
      // Shadow
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 8,
    },
    actionText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
  });
}
