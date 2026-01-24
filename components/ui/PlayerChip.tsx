import { useTheme } from '@/context/ThemeContext';
import { MatchingType } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PlayerChipProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  matchingType?: MatchingType | null;
  onPress: () => void;
}

export function PlayerChip({
  name,
  selected = false,
  disabled = false,
  matchingType,
  onPress,
}: PlayerChipProps) {
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();

  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: palette.modalBg, borderColor: palette.border },
        !selected && matchingType === 'mmp' && { borderColor: mmpColor },
        !selected && matchingType === 'fmp' && { borderColor: fmpColor },
        selected && { backgroundColor: palette.accent, borderColor: palette.accent },
        disabled && { opacity: 0.4 },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}>
      <Text
        style={[
          styles.chipText,
          { color: palette.modalText },
          selected && { color: palette.textOnAccent },
        ]}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
