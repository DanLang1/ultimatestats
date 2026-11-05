import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

/** Saved Games before any game is saved, with a link to the stats showcase. */
export default function SavedGamesEmptyState() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="history"
        size={scaleBySizeClass(48, sizeClass)}
        color={palette.textMuted}
      />
      <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
        No saved games yet
      </ThemedText>
      <Pressable
        testID="saved-games-showcase"
        accessibilityRole="button"
        accessibilityLabel="See what full game stats look like"
        onPress={() => router.push('/showcase')}
        style={({ pressed }) => [styles.showcaseLink, pressed && styles.showcaseLinkPressed]}>
        <ThemedText style={[styles.showcaseLinkText, { color: palette.accent }]}>
          See what full game stats look like
        </ThemedText>
        <MaterialCommunityIcons
          name="chevron-right"
          size={scaleBySizeClass(18, sizeClass)}
          color={palette.accent}
        />
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    emptyState: {
      padding: 40,
      alignItems: 'center',
      gap: 16,
      marginTop: 40,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
    },
    showcaseLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(2, sizeClass),
      minHeight: scaleBySizeClass(44, sizeClass),
    },
    showcaseLinkPressed: {
      opacity: 0.6,
    },
    showcaseLinkText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
