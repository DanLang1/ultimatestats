import { Pressable, StyleSheet, View } from 'react-native';

import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';

interface TimeoutDotsProps {
  state: SideTimeoutState;
  activeColor: string;
  onPress?: () => void;
  testID?: string;
}

export function TimeoutDots({ state, activeColor, onPress, testID }: TimeoutDotsProps) {
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} hitSlop={6}>
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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
    },
    dot: {
      width: scaleBySizeClass(10, sizeClass),
      height: scaleBySizeClass(10, sizeClass),
      borderRadius: 999,
      borderWidth: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
    },
    diamond: {
      width: scaleBySizeClass(9, sizeClass),
      height: scaleBySizeClass(9, sizeClass),
      borderRadius: scaleBySizeClass(1, sizeClass),
      borderWidth: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      transform: [{ rotate: '45deg' }],
      marginHorizontal: scaleBySizeClass(2, sizeClass),
    },
  });
}
