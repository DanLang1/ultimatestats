import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AggregateBottomBarProps {
  selectedCount: number;
  onViewAggregated: () => void;
  isVisible: boolean;
}

export default function AggregateBottomBar({
  selectedCount,
  onViewAggregated,
  isVisible,
}: AggregateBottomBarProps) {
  const { palette } = useTheme();

  if (!isVisible || selectedCount === 0) return null;

  return (
    <View style={styles.bottomBar}>
      <Pressable
        style={[
          styles.viewCombinedButton,
          { backgroundColor: palette.accent, shadowColor: palette.shadow },
        ]}
        onPress={onViewAggregated}>
        <MaterialCommunityIcons name="chart-box" size={20} color={palette.textOnAccent} />
        <Text style={[styles.viewCombinedText, { color: palette.textOnAccent }]}>
          View Combined ({selectedCount} game{selectedCount !== 1 ? 's' : ''})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    right: 24, // Anchored to the right
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  viewCombinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20, // Slightly more compact
    paddingVertical: 12,
    borderRadius: 25,
    opacity: 0.95, // Subtle transparency to see content behind
    // Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  viewCombinedText: {
    fontSize: 15, // Slightly smaller
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
