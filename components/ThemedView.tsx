import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  const { palette } = useTheme();
  return <View style={[{ backgroundColor: palette.modalBg }, style]} {...otherProps} />;
}

export type AnimatedThemedViewProps = ViewProps & {
  entering?: any;

  exiting?: any;

  layout?: any;
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
