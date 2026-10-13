import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { ChangelogEntry } from '@/lib/changelog';
import { Fonts } from '@/theme/theme';

export function ChangelogCard({
  entry,
  isCurrent = false,
}: {
  entry: ChangelogEntry;
  isCurrent?: boolean;
}) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View
      style={[
        styles.changelogEntry,
        { backgroundColor: palette.overlay08 },
        isCurrent && { borderColor: palette.accent, borderWidth: 1 },
      ]}>
      <View style={styles.changelogHeader}>
        <ThemedText style={[styles.changelogVersion, { color: palette.textInverse }]}>
          v{entry.version}
        </ThemedText>
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: palette.accentOverlay10 }]}>
            <ThemedText style={[styles.currentBadgeText, { color: palette.accent }]}>
              Current
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={[styles.changelogDate, { color: palette.textMuted }]}>
        {entry.date}
      </ThemedText>
      <View style={styles.changesList}>
        {entry.changes.map((change, i) => (
          <View key={i} style={styles.changeItem}>
            <ThemedText style={[styles.changeBullet, { color: palette.accent }]}>•</ThemedText>
            <ThemedText style={[styles.changeText, { color: palette.textMuted }]}>
              {change}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    changelogEntry: {
      borderRadius: scaleBySizeClass(14, sizeClass),
      padding: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(8, sizeClass),
    },
    changelogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(10, sizeClass),
    },
    changelogVersion: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    currentBadge: {
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(3, sizeClass),
      borderRadius: scaleBySizeClass(6, sizeClass),
    },
    currentBadgeText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    changelogDate: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    changesList: {
      gap: scaleBySizeClass(6, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    changeItem: {
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
    },
    changeBullet: {
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    changeText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      flex: 1,
    },
  });
}
