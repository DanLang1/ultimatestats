import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AnalyticsShortcutCardProps {
  title: string;
  description: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}

export default function AnalyticsShortcutCard({
  title,
  description,
  detail,
  icon,
  onPress,
}: AnalyticsShortcutCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.overlay05,
          borderColor: palette.overlay10,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.accentOverlay10 }]}>
        <MaterialCommunityIcons
          name={icon}
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.accent}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: palette.textInverse }]}>{title}</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text>
        <Text style={[styles.detail, { color: palette.accent }]}>{detail}</Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={scaleBySizeClass(20, sizeClass)}
        color={palette.textMuted}
      />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(14, sizeClass),
    },
    iconWrap: {
      width: scaleBySizeClass(42, sizeClass),
      height: scaleBySizeClass(42, sizeClass),
      borderRadius: scaleBySizeClass(21, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '700',
    },
    description: {
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    detail: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.5, sizeClass, { rounding: 'none' }),
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
