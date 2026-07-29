import { type ViewProps } from 'react-native';
import Animated, {
  type AnimatedProps,
  type BaseAnimationBuilder,
  type EntryExitAnimationFunction,
  type LayoutAnimationFunction,
} from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

type AnimationProp =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | undefined;
type LayoutProp = BaseAnimationBuilder | typeof BaseAnimationBuilder | LayoutAnimationFunction;

export type AnimatedThemedViewProps = AnimatedProps<ViewProps> & {
  entering?: AnimationProp;
  exiting?: AnimationProp;
  layout?: LayoutProp;
  onStartShouldSetResponder?: () => boolean;
};

export function AnimatedThemedView({
  style,
  entering,
  exiting,
  layout,
  onStartShouldSetResponder,
  ...otherProps
}: AnimatedThemedViewProps) {
  const { palette } = useTheme();
  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      layout={layout}
      onStartShouldSetResponder={onStartShouldSetResponder}
      style={[{ backgroundColor: palette.modalBg }, style]}
      {...otherProps}
    />
  );
}
