import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { OrientationMode, useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export function AppearanceSettingsSection() {
  const { palette, themeMode, setThemeMode } = useTheme();
  const { sizeClass } = useLayout();
  const { showAlert } = useAlert();
  const orientationMode = useSettingsStore((state) => state.orientationMode);
  const setOrientationMode = useSettingsStore((state) => state.setOrientationMode);
  const styles = createStyles(sizeClass);
  const isAndroidLargeScreen = Platform.OS === 'android' && sizeClass !== 'small';

  const handleOrientationModeChange = (nextMode: OrientationMode) => {
    if (nextMode === orientationMode) return;
    if (isAndroidLargeScreen && nextMode !== 'system') {
      showAlert({
        title: 'Orientation Lock Warning',
        message:
          '1. Landscape / Portrait mode may not apply on this large device.\n2. Setting these modes may cause letterboxing.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Anyway',
            style: 'default',
            onPress: () => setOrientationMode(nextMode),
          },
        ],
      });
      return;
    }
    setOrientationMode(nextMode);
  };

  return (
    <View style={styles.appearanceSection}>
      <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>APP</ThemedText>
      <SegmentedControl
        label="THEME"
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={themeMode}
        onChange={setThemeMode}
      />
      <SegmentedControl
        label="ORIENTATION"
        options={[
          { value: 'system', label: 'System' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ]}
        value={orientationMode}
        onChange={handleOrientationModeChange}
      />
      {isAndroidLargeScreen && (
        <ThemedText style={[styles.helperText, { color: palette.textMuted }]}>
          On large Android devices, orientation locks may be ignored (blame Android not me please).
        </ThemedText>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    appearanceSection: {
      marginTop: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    helperText: {
      fontSize: scaleBySizeClass(11, sizeClass),
    },
  });
}
