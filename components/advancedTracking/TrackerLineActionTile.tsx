import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import {
  getTrackerChipContentGrowth,
  getTrackerChipContentScale,
  isTrackerChipContentCompact,
} from '@/lib/advancedTracking/trackerLayoutUtils';
import { Fonts } from '@/theme/theme';

const TILE_BORDER_RADIUS = 12;
const ICON_WRAP_SIZE = 40;

interface TrackerLineActionTileProps {
  chipWidth: number;
  onPress: () => void;
}

export function TrackerLineActionTile({ chipWidth, onPress }: TrackerLineActionTileProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const contentGrowth = getTrackerChipContentGrowth(chipWidth);
  // The icon shrinks on compact chips and grows on large ones; text only grows.
  const iconScale = getTrackerChipContentScale(chipWidth) * contentGrowth;
  // Below full size, the subtitle no longer fits under the icon and label.
  const showSubtitle = !isTrackerChipContentCompact(chipWidth);
  const iconWrapSize = Math.round(ICON_WRAP_SIZE * iconScale);

  return (
    <Pressable
      testID="tracker-line-action-tile"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          width: chipWidth,
          backgroundColor: palette.overlay05,
          borderColor: palette.overlay20,
        },
        pressed && { opacity: 0.75 },
      ]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: iconWrapSize,
            height: iconWrapSize,
            backgroundColor: palette.accentOverlay10,
          },
        ]}>
        <MaterialCommunityIcons
          name="account-switch-outline"
          size={scaleBySizeClass(24 * iconScale, sizeClass)}
          color={palette.accent}
        />
      </View>
      <ThemedText
        style={[
          styles.label,
          {
            color: palette.textInverse,
            fontSize: scaleBySizeClass(14 * contentGrowth, sizeClass),
          },
        ]}
        numberOfLines={1}>
        Line
      </ThemedText>
      {showSubtitle && (
        <ThemedText
          style={[
            styles.subtitle,
            {
              color: palette.textMuted,
              fontSize: scaleBySizeClass(10 * contentGrowth, sizeClass),
            },
          ]}
          numberOfLines={1}>
          Change
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignSelf: 'flex-start',
    aspectRatio: 1,
    borderRadius: TILE_BORDER_RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  iconWrap: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.bold,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
