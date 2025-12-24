import { View, type ViewProps } from 'react-native';

import { palette } from '@/theme/theme';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  return <View style={[{ backgroundColor: palette.surface }, style]} {...otherProps} />;
}
