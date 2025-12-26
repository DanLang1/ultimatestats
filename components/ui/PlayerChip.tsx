import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PlayerChipProps {
  name: string;
  selected?: boolean;
  onPress: () => void;
}

export function PlayerChip({ name, selected = false, onPress }: PlayerChipProps) {
  const { palette } = useTheme();

  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: palette.modalBg, borderColor: palette.border },
        selected && [
          styles.chipSelected,
          { backgroundColor: palette.accent, borderColor: palette.accent },
        ],
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.chipText,
          { color: palette.modalText },
          selected && [styles.chipTextSelected, { color: palette.textInverse }],
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
    // backgroundColor: palette.inputBg, // Dynamic
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    // backgroundColor: palette.accent, // Dynamic
    // borderColor: palette.accent, // Dynamic
  },
  chipText: {
    fontSize: 16,
    // color: textColor, // Dynamic
    fontWeight: '500',
  },
  chipTextSelected: {
    // color: palette.textInverse, // Dynamic
  },
});
