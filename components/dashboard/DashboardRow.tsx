import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface DashboardRowProps {
  label: string;
  /** A dot for something new behind the row, such as an unseen changelog. */
  showDot?: boolean;
  /** A leading live dot for a row about the game in progress. */
  isLive?: boolean;
  showDivider: boolean;
  onPress: () => void;
  testID?: string;
}

/** One destination in a dashboard section: its label and a chevron. */
export default function DashboardRow({
  label,
  showDot = false,
  isLive = false,
  showDivider,
  onPress,
  testID,
}: DashboardRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={showDot ? 'Has something new' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: palette.overlay08, borderBottomWidth: 1 },
        pressed && { backgroundColor: palette.overlay05 },
      ]}>
      {isLive && <View style={[styles.dot, { backgroundColor: palette.danger }]} />}
      <ThemedText style={[styles.label, { color: palette.textInverse }]}>{label}</ThemedText>
      {showDot && <View style={[styles.dot, { backgroundColor: palette.accent }]} />}
      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(22, sizeClass)}
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
      gap: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      minHeight: scaleBySizeClass(52, sizeClass),
    },
    label: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    dot: {
      width: scaleBySizeClass(8, sizeClass),
      height: scaleBySizeClass(8, sizeClass),
      borderRadius: 999,
    },
  });
}
