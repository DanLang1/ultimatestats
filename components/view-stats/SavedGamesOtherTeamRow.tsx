import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SavedGamesOtherTeamRowProps {
  label: string;
  /** Muted count after the label, e.g. "12 games". */
  detail: string;
  accessibilityLabel: string;
  showDivider: boolean;
  onPress: () => void;
  testID: string;
}

/** A link from the Saved Games list to another team's games. */
export default function SavedGamesOtherTeamRow({
  label,
  detail,
  accessibilityLabel,
  showDivider,
  onPress,
  testID,
}: SavedGamesOtherTeamRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: palette.overlay08, borderBottomWidth: 1 },
        pressed && { backgroundColor: palette.overlay05 },
      ]}>
      <ThemedText style={[styles.label, { color: palette.textInverse }]} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.detail, { color: palette.textMuted }]}>{detail}</ThemedText>
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(20, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      minHeight: scaleBySizeClass(52, sizeClass),
      paddingLeft: scaleBySizeClass(14, sizeClass),
      paddingRight: scaleBySizeClass(10, sizeClass),
    },
    label: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    detail: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontVariant: ['tabular-nums'],
    },
  });
}
