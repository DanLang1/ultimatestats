import { SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TimeoutDotsProps {
  state: SideTimeoutState;
  activeColor: string;
  onPress?: () => void;
}

export function TimeoutDots({ state, activeColor, onPress }: TimeoutDotsProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6}>
      <View style={styles.row}>
        {Array.from({ length: state.regularPerHalf }, (_, i) => (
          <View
            key={`r-${i}`}
            style={[
              styles.dot,
              {
                backgroundColor: i >= state.regularUsedInHalf ? activeColor : 'transparent',
                borderColor: activeColor,
              },
            ]}
          />
        ))}
        {state.floaterEnabled && (
          <View
            style={[
              styles.diamond,
              {
                backgroundColor: !state.floaterUsed ? activeColor : 'transparent',
                borderColor: activeColor,
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  diamond: {
    width: 9,
    height: 9,
    borderRadius: 1,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 2,
  },
});
