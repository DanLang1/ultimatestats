import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface StatPillProps {
  value: number;
  label: string;
  bgColor: string;
  textColor: string;
}

export default function StatPill({ value, label, bgColor, textColor }: StatPillProps) {
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.pillValue, { color: textColor }]}>{value}</ThemedText>
      <ThemedText style={[styles.pillLabel, { color: textColor }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    pillValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    pillLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
