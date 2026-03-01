import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EditableSettingCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
  /** When provided, the tile is treated as a toggle: no chevron, icon tints accent when true */
  isActive?: boolean;
  sizeClass?: SizeClass;
}

export function EditableSettingCard({
  icon,
  label,
  children,
  onPress,
  isActive,
  sizeClass = 'small',
}: EditableSettingCardProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Compress fast, then spring back with a slight overshoot (the "flip" bounce)
    scale.value = withSequence(
      withTiming(0.93, { duration: 70 }),
      withSpring(1, { damping: 5, stiffness: 180, mass: 0.7 }),
    );
    onPress?.();
  };

  const isToggle = isActive !== undefined;
  const iconColor = isToggle && isActive ? palette.accent : palette.textMuted;

  const inner = (
    <>
      <MaterialCommunityIcons
        name={icon}
        size={scaleBySizeClass(16, sizeClass)}
        color={iconColor}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
        {children}
      </View>
      {!isToggle && onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={scaleBySizeClass(14, sizeClass)}
          color={palette.textMuted}
          style={styles.chevron}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        style={[styles.card, { backgroundColor: palette.overlay05 }, animatedStyle]}>
        {inner}
      </AnimatedPressable>
    );
  }

  return <View style={[styles.card, { backgroundColor: palette.overlay05 }]}>{inner}</View>;
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      width: '48%',
    },
    textContainer: {
      flex: 1,
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    chevron: {
      position: 'absolute',
      top: 4,
      right: 4,
    },
  });
}
