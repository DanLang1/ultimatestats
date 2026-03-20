import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
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
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(16, sizeClass),
      lineHeight: scaleBySizeClass(24, sizeClass),
    },
    defaultSemiBold: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(16, sizeClass),
      lineHeight: scaleBySizeClass(24, sizeClass),
    },
    title: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(32, sizeClass),
      lineHeight: scaleBySizeClass(32, sizeClass),
    },
    subtitle: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(20, sizeClass),
    },
    link: {
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(30, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
    },
  });
}
