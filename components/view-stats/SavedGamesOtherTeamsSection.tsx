import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface SavedGamesOtherTeamsSectionProps {
  title: string;
  testID: string;
  /** A link beside the heading, e.g. to every team. */
  headerAction?: ReactNode;
  /** `SavedGamesOtherTeamRow`s. */
  children: ReactNode;
}

/** A muted heading over links to other teams at the end of the Saved Games list. */
export default function SavedGamesOtherTeamsSection({
  title,
  testID,
  headerAction,
  children,
}: SavedGamesOtherTeamsSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.header}>
        <ThemedText accessibilityRole="header" style={[styles.title, { color: palette.textMuted }]}>
          {title}
        </ThemedText>
        {headerAction}
      </View>
      {/* Same surface as a day of games, so the rows read as tappable like them. */}
      <View style={[styles.surface, { backgroundColor: palette.overlay05 }]}>{children}</View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: scaleBySizeClass(8, sizeClass),
      marginTop: scaleBySizeClass(8, sizeClass),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: scaleBySizeClass(24, sizeClass),
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    title: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    surface: {
      borderRadius: 14,
      overflow: 'hidden',
    },
  });
}
