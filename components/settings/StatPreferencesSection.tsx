import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export function StatPreferencesSection() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const statEntryOrder = useSettingsStore((state) => state.statEntryOrder);
  const setStatEntryOrder = useSettingsStore((state) => state.setStatEntryOrder);
  const linePlayerSortOrder = useSettingsStore((state) => state.linePlayerSortOrder);
  const setLinePlayerSortOrder = useSettingsStore((state) => state.setLinePlayerSortOrder);

  return (
    <>
      <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
        STAT PREFERENCES
      </ThemedText>
      <View style={styles.preferencesStack}>
        <SegmentedControl
          label="STAT ENTRY (BASIC)"
          options={[
            { value: 'goal_first', label: 'Goal First' },
            { value: 'assist_first', label: 'Assist First' },
          ]}
          value={statEntryOrder}
          onChange={setStatEntryOrder}
        />
        <SegmentedControl
          label="SORT PLAYERS"
          options={[
            { value: 'alpha', label: 'A-Z' },
            { value: 'number', label: '#s' },
            { value: 'points', label: 'Points Played' },
          ]}
          value={linePlayerSortOrder}
          onChange={setLinePlayerSortOrder}
        />
      </View>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    preferencesStack: {
      gap: scaleBySizeClass(12, sizeClass),
    },
  });
}
