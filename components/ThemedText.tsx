import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { StyleSheet, Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Text
      style={[
        { color: palette.textPrimary },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && [styles.link, { color: palette.accent }],
        style,
      ]}
      {...rest}
    />
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    default: {
      fontSize: scaleBySizeClass(16, sizeClass),
      lineHeight: scaleBySizeClass(24, sizeClass),
    },
    defaultSemiBold: {
      fontSize: scaleBySizeClass(16, sizeClass),
      lineHeight: scaleBySizeClass(24, sizeClass),
      fontWeight: '600',
    },
    title: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontWeight: 'bold',
      lineHeight: scaleBySizeClass(32, sizeClass),
    },
    subtitle: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontWeight: 'bold',
    },
    link: {
      lineHeight: scaleBySizeClass(30, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
    },
  });
}
