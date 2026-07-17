import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';
import { useBounceAnimation } from '@/hooks/useBounceAnimation';

interface TutorialAnimatedArrowProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  color?: string;
  size?: number;
  style?: ViewStyle;
}

const ICON_NAMES = {
  down: 'chevron-down',
  up: 'chevron-up',
  left: 'chevron-left',
  right: 'chevron-right',
} as const;

export default function TutorialAnimatedArrow({
  direction = 'down',
  color,
  size = 32,
  style,
}: TutorialAnimatedArrowProps) {
  const { palette } = useTheme();
  const arrowColor = color ?? palette.textInverse;

  const isHorizontal = direction === 'left' || direction === 'right';
  const delta = direction === 'down' || direction === 'right' ? 14 : -14;
  const iconName = ICON_NAMES[direction];

  const animatedStyle = useBounceAnimation({ delta, isHorizontal });

  const trailingStyle = isHorizontal
    ? [styles.trailingChevron, { marginLeft: -(size * 0.45) }]
    : [styles.trailingChevron, { marginTop: -(size * 0.45) }];

  return (
    <Animated.View
      style={[isHorizontal ? styles.containerRow : styles.container, style, animatedStyle]}
      pointerEvents="none">
      <MaterialCommunityIcons name={iconName} size={size} color={arrowColor} />
      <MaterialCommunityIcons
        name={iconName}
        size={size}
        color={arrowColor}
        style={trailingStyle}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailingChevron: {
    opacity: 0.35,
  },
});
