import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  const { palette } = useTheme();
  return <View style={[{ backgroundColor: palette.modalBg }, style]} {...otherProps} />;
}
