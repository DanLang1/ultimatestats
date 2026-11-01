import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A sentence-case heading over one shared surface that holds the section's rows. */
export default function DashboardSection({ title, children, style }: DashboardSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.section, style]}>
      <ThemedText style={[styles.title, { color: palette.textInverse }]}>{title}</ThemedText>
      <View style={[styles.surface, { backgroundColor: palette.overlay05 }]}>{children}</View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    section: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: scaleBySizeClass(4, sizeClass),
    },
    surface: {
      borderRadius: 14,
      overflow: 'hidden',
    },
  });
}
