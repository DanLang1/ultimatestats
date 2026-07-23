import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface FlashingIconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size: number;
  color: string;
  isFlashing: boolean;
}

export default function FlashingIcon({ name, size, color, isFlashing }: FlashingIconProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isFlashing) {
      opacity.set(withRepeat(withTiming(0.2, { duration: 800 }), -1, true));
    } else {
      cancelAnimation(opacity);
      opacity.set(1);
    }
  }, [isFlashing, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.get(),
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </Animated.View>
  );
}
