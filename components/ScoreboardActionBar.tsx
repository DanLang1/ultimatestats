import { useTheme } from '@/context/ThemeContext';
import { useUIStore } from '@/store/uiStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

export type ActionBarAction =
  | { type: 'drop' }
  | { type: 'throwaway' }
  | { type: 'oppBlock' }
  | { type: 'fiftyfifty' }
  | { type: 'block' }
  | { type: 'turn' };

interface ScoreboardActionBarProps {
  possession: 'team1' | 'team2' | null;
  onAction: (action: ActionBarAction) => void;
}

const BAR_WIDTH_INITIAL = 280;
const BAR_HEIGHT_INITIAL = 56;
const BAR_HEIGHT_HORIZONTAL = 56;
const BAR_WIDTH_HORIZONTAL = 420;
const BAR_HEIGHT_VERTICAL = 230;
const BAR_WIDTH_VERTICAL = 60;

export function ScoreboardActionBar({ possession, onAction }: ScoreboardActionBarProps) {
  const { palette } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    actionBarPosition,
    actionBarOrientation,
    setActionBarPosition,
    toggleActionBarOrientation,
  } = useUIStore();

  const isVertical = actionBarOrientation === 'vertical';
  const isMyTeam = possession === 'team1';

  // Derive initial position: use stored position or calculate default center-bottom
  const getInitialX = () => {
    if (actionBarPosition.x === 0 && actionBarPosition.y === 0) {
      return (screenWidth - BAR_WIDTH_INITIAL) / 2;
    }
    return actionBarPosition.x;
  };

  const getInitialY = () => {
    if (actionBarPosition.x === 0 && actionBarPosition.y === 0) {
      return screenHeight - BAR_HEIGHT_INITIAL - 100;
    }
    return actionBarPosition.y;
  };

  // Shared values for smooth dragging
  const translateX = useSharedValue(getInitialX());
  const translateY = useSharedValue(getInitialY());
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const boxWidth = useSharedValue(BAR_WIDTH_INITIAL);
  const boxHeight = useSharedValue(BAR_HEIGHT_INITIAL);
  // Clamp position within screen bounds
  const clampPosition = (x: number, y: number) => {
    'worklet';
    const effectiveWidth = Math.max(
      boxWidth.value,
      isVertical ? BAR_WIDTH_VERTICAL : BAR_WIDTH_HORIZONTAL,
    );
    const effectiveHeight = Math.max(
      boxHeight.value,
      isVertical ? BAR_HEIGHT_VERTICAL : BAR_HEIGHT_HORIZONTAL,
    );

    // Account for safe areas and margin for shadows
    const leftBound = insets.left + 8;
    const rightBound = screenWidth - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.bottom - effectiveHeight - 8;

    const clampedX = Math.max(leftBound, Math.min(x, rightBound));
    const clampedY = Math.max(topBound, Math.min(y, bottomBound));
    return { x: clampedX, y: clampedY };
  };

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      const newX = startX.value + e.translationX;
      const newY = startY.value + e.translationY;
      const clamped = clampPosition(newX, newY);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      isDragging.value = false;

      // Perform final hard clamp
      const finalClamped = clampPosition(translateX.value, translateY.value);

      translateX.value = withSpring(finalClamped.x);
      translateY.value = withSpring(finalClamped.y);

      scheduleOnRN(setActionBarPosition, { x: finalClamped.x, y: finalClamped.y });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(isDragging.value ? 1.05 : 1, { damping: 30 }) },
    ],
    opacity: withSpring(isDragging.value ? 0.8 : 1),
  }));

  if (!possession) return null;

  const barBackgroundColor = palette.glassBg;

  const buttons = isMyTeam
    ? [
        {
          label: 'OPP D',
          action: { type: 'oppBlock' as const },
          color: palette.warning,
          emoji: '💀',
        },
        {
          label: 'DROP',
          action: { type: 'drop' as const },
          color: palette.danger,
          emoji: '🧈',
        },
        {
          label: 'T/A',
          action: { type: 'throwaway' as const },
          color: palette.danger,
          emoji: '🗑️',
        },
        {
          label: '50/50',
          action: { type: 'fiftyfifty' as const },
          color: palette.danger,
          emoji: '⚖️',
        },
      ]
    : [
        {
          label: 'BLOCK',
          action: { type: 'block' as const },
          color: palette.success,
          emoji: '✋',
        },
        {
          label: 'OPP TURN',
          action: { type: 'turn' as const },
          color: palette.accent,
          emoji: '🎁',
        },
      ];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          boxWidth.value = width;
          boxHeight.value = height;
        }}
        style={[
          styles.container,
          animatedStyle,
          {
            backgroundColor: barBackgroundColor,
            borderColor: palette.overlay10,
            flexDirection: isVertical ? 'column' : 'row',
          },
        ]}>
        {/* Drag handle / orientation toggle */}
        <Pressable style={styles.dragHandle} onPress={toggleActionBarOrientation}>
          <MaterialCommunityIcons
            name={isVertical ? 'arrow-expand-horizontal' : 'arrow-expand-vertical'}
            size={14}
            color={palette.textMuted}
          />
        </Pressable>

        {/* Action buttons */}
        {buttons.map((btn) => (
          <Pressable
            key={btn.label}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => onAction(btn.action)}>
            {'emoji' in btn ? (
              <Text style={{ fontSize: 18 }}>{btn.emoji}</Text>
            ) : (
              // @ts-ignore
              <MaterialCommunityIcons name={btn.icon} size={20} color={btn.color} />
            )}
            {!isVertical && (
              <Text style={[styles.buttonText, { color: palette.textInverse }]}>{btn.label}</Text>
            )}
          </Pressable>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  dragHandle: {
    padding: 6,
    borderRadius: 12,
    opacity: 0.6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
