import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const TILE_BORDER_RADIUS = 12;

interface TrackerLineActionTileProps {
  chipWidth: number;
  onPress: () => void;
}

export function TrackerLineActionTile({ chipWidth, onPress }: TrackerLineActionTileProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

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
      <View style={[styles.iconWrap, { backgroundColor: palette.accentOverlay10 }]}>
        <MaterialCommunityIcons
          name="account-switch-outline"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.accent}
        />
      </View>
      <ThemedText
        style={[
          styles.label,
          {
            color: palette.textInverse,
            fontSize: scaleBySizeClass(14, sizeClass),
          },
        ]}
        numberOfLines={1}>
        Line
      </ThemedText>
      <ThemedText
        style={[
          styles.subtitle,
          {
            color: palette.textMuted,
            fontSize: scaleBySizeClass(10, sizeClass),
          },
        ]}
        numberOfLines={1}>
        Change
      </ThemedText>
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
    padding: 10,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
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
