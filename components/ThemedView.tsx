import { View, type ViewProps } from 'react-native';
import Animated, {
  AnimatedProps,
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  LayoutAnimationFunction,
} from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  const { palette } = useTheme();
  return <View style={[{ backgroundColor: palette.modalBg }, style]} {...otherProps} />;
}

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
