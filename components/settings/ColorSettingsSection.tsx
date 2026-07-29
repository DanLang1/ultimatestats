import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { TeamColorPicker } from '@/components/ui/ColorPicker';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export function ColorSettingsSection() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const mmpColor = useSettingsStore((state) => state.mmpColor);
  const fmpColor = useSettingsStore((state) => state.fmpColor);
  const setMmpColor = useSettingsStore((state) => state.setMmpColor);
  const setFmpColor = useSettingsStore((state) => state.setFmpColor);
  const resetMatchingTypeColors = useSettingsStore((state) => state.resetMatchingTypeColors);
  const team1BgColor = useGameStore((state) => state.team1BgColor);
  const team2BgColor = useGameStore((state) => state.team2BgColor);
  const setTeamBgColor = useGameStore((state) => state.setTeamBgColor);
  const compact = sizeClass !== 'small';

  return (
    <>
      <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
      <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
        TEAM COLORS
      </ThemedText>
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="MY TEAM COLOR"
              value={team1BgColor}
              onChange={(color) => setTeamBgColor('team1', color)}
            />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="OPPOSING TEAM COLOR"
              value={team2BgColor}
              onChange={(color) => setTeamBgColor('team2', color)}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker
            label="MY TEAM COLOR"
            value={team1BgColor}
            onChange={(color) => setTeamBgColor('team1', color)}
          />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker
            label="OPPOSING TEAM COLOR"
            value={team2BgColor}
            onChange={(color) => setTeamBgColor('team2', color)}
          />
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={() => {
          setTeamBgColor('team1', palette.surface);
          setTeamBgColor('team2', palette.primary);
        }}>
        <ThemedText style={[styles.resetColorsButtonText, { color: palette.textMuted }]}>
          Reset to Default
        </ThemedText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
      <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
        PLAYER NAME COLORS
      </ThemedText>
      {compact ? (
        <View style={styles.compactColorGrid}>
          <View style={styles.compactColorItem}>
            <TeamColorPicker label="MMP (MALE MATCHING)" value={mmpColor} onChange={setMmpColor} />
          </View>
          <View style={styles.compactColorItem}>
            <TeamColorPicker
              label="FMP (FEMALE MATCHING)"
              value={fmpColor}
              onChange={setFmpColor}
            />
          </View>
        </View>
      ) : (
        <>
          <TeamColorPicker label="MMP (MALE MATCHING)" value={mmpColor} onChange={setMmpColor} />
          <View style={styles.colorPickerSpacer} />
          <TeamColorPicker label="FMP (FEMALE MATCHING)" value={fmpColor} onChange={setFmpColor} />
        </>
      )}
      <Pressable
        style={({ pressed }) => [styles.resetColorsButton, pressed && { opacity: 0.7 }]}
        onPress={resetMatchingTypeColors}>
        <ThemedText style={[styles.resetColorsButtonText, { color: palette.textMuted }]}>
          Reset to Default
        </ThemedText>
      </Pressable>
    </>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: scaleBySizeClass(4, sizeClass),
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(12, sizeClass),
    },
    compactColorGrid: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(12, sizeClass),
    },
    compactColorItem: {
      flex: isLandscape ? 1 : undefined,
    },
    colorPickerSpacer: {
      height: scaleBySizeClass(12, sizeClass),
    },
    resetColorsButton: {
      alignSelf: 'flex-start',
      paddingVertical: scaleBySizeClass(4, sizeClass),
    },
    resetColorsButtonText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
