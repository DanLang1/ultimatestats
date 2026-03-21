import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface TutorialStepProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: React.ReactNode;
  sizeClass?: SizeClass;
}

export default function TutorialStep({
  icon,
  title,
  description,
  sizeClass = 'small',
}: TutorialStepProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(40, sizeClass);

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: palette.accentOverlay15 }]}>
        <MaterialCommunityIcons name={icon} size={iconSize} color={palette.accent} />
      </View>
      <ThemedText style={[styles.title, { color: palette.modalText }]}>{title}</ThemedText>
      <ThemedText style={[styles.description, { color: palette.modalTextMuted }]}>
        {description}
      </ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: scaleBySizeClass(15, sizeClass),
      textAlign: 'center',
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
  });
}
