import { palette } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PlayerChipProps {
  name: string;
  selected?: boolean;
  onPress: () => void;
}

export function PlayerChip({ name, selected = false, onPress }: PlayerChipProps) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: palette.inputBg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: 16,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: palette.textInverse,
  },
});
