import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TutorialStepProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: React.ReactNode;
}

export default function TutorialStep({ icon, title, description }: TutorialStepProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(40, sizeClass);

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: palette.accentOverlay15 }]}>
        <MaterialCommunityIcons name={icon} size={iconSize} color={palette.accent} />
      </View>
      <Text style={[styles.title, { color: palette.modalText }]}>{title}</Text>
      <Text style={[styles.description, { color: palette.modalTextMuted }]}>{description}</Text>
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
      fontWeight: '700',
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
