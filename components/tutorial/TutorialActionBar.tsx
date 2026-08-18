import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';
import { useReclampOnResize } from '@/hooks/useReclampOnResize';
import { Fonts } from '@/theme/theme';

interface TutorialActionBarProps {
  showStartPoint: boolean;
  possession: 'team1' | 'team2' | null;
  onStartPoint: () => void;
  onBlock: () => void;
  highlightButton?: 'start' | 'block' | null;
}

export default function TutorialActionBar({
  showStartPoint,
  possession,
  onStartPoint,
  onBlock,
  highlightButton,
}: TutorialActionBarProps) {
  const { palette } = useTheme();
  const { width: screenWidth, height: screenHeight, sizeClass } = useLayout();
  const metrics = getMetrics(sizeClass);
  const styles = createStyles(metrics);
  const { iconSize } = metrics;
  const dragIconSize = iconSize - 6;
  const insets = useSafeAreaInsets();

  const highlightStartPulse = usePulseAnimation(
    highlightButton === 'start',
    800,
    ReduceMotion.Never,
  );
  const highlightBlockPulse = usePulseAnimation(
    highlightButton === 'block',
    800,
    ReduceMotion.Never,
  );

  // Drag state — start centered near bottom
  const translateX = useSharedValue((screenWidth - metrics.estimatedWidth) / 2);
  const translateY = useSharedValue(
    screenHeight - insets.top - insets.bottom - metrics.estimatedHeight - 100,
  );
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const dragOpacity = useSharedValue(1);
  const boxWidth = useSharedValue(metrics.estimatedWidth);
  const boxHeight = useSharedValue(metrics.estimatedHeight);
  const [measuredSize, setMeasuredSize] = useState({
    width: metrics.estimatedWidth,
    height: metrics.estimatedHeight,
  });

  useReclampOnResize({
    translateX,
    translateY,
    effectiveWidth: measuredSize.width,
    effectiveHeight: measuredSize.height,
  });

  const clampPosition = (x: number, y: number) => {
    'worklet';
    const effectiveWidth = boxWidth.get();
    const effectiveHeight = boxHeight.get();
    const leftBound = 8;
    const rightBound = screenWidth - insets.left - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.top - insets.bottom - effectiveHeight - 10;
    const clampedX = Math.max(leftBound, Math.min(x, rightBound));
    const clampedY = Math.max(topBound, Math.min(y, bottomBound));
    return { x: clampedX, y: clampedY };
  };

  // oxlint-disable-next-line react/react-compiler -- Gesture.Pan is a factory; keep the literal call so Worklets can recognize the gesture chain.
  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      'worklet';
      startX.set(translateX.get());
      startY.set(translateY.get());
      dragScale.set(withSpring(1.05, { damping: 30 }));
      dragOpacity.set(withSpring(0.8));
    })
    .onUpdate((e) => {
      'worklet';
      const newX = startX.get() + e.translationX;
      const newY = startY.get() + e.translationY;
      const clamped = clampPosition(newX, newY);
      translateX.set(clamped.x);
      translateY.set(clamped.y);
    })
    .onEnd(() => {
      'worklet';
      dragScale.set(withSpring(1, { damping: 30 }));
      dragOpacity.set(withSpring(1));
      const finalClamped = clampPosition(translateX.get(), translateY.get());
      translateX.set(withSpring(finalClamped.x));
      translateY.set(withSpring(finalClamped.y));
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale: dragScale.get() },
      ],
      opacity: dragOpacity.get(),
    };
  });

  // Hide when our team has disc (they tap the score section to score)
  if (!showStartPoint && possession !== 'team2') return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          boxWidth.set(width);
          boxHeight.set(height);
          setMeasuredSize({ width, height });
        }}
        style={[
          styles.container,
          animatedStyle,
          {
            backgroundColor: palette.glassBg,
            borderColor: palette.overlay10,
            shadowColor: palette.shadow,
          },
        ]}>
        {/* Drag handle */}
        <Pressable style={styles.dragHandle}>
          <MaterialCommunityIcons
            name="arrow-expand-vertical"
            size={dragIconSize}
            color={palette.textMuted}
          />
        </Pressable>

        {showStartPoint ? (
          <Animated.View style={highlightButton === 'start' ? highlightStartPulse : undefined}>
            <Pressable
              style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
              onPress={onStartPoint}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={iconSize + 2}
                color={palette.accent}
              />
              <ThemedText style={[styles.startText, { color: palette.accent }]}>
                START POINT
              </ThemedText>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View style={highlightButton === 'block' ? highlightBlockPulse : undefined}>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={onBlock}>
                <MaterialCommunityIcons
                  name="hand-back-left-outline"
                  size={iconSize}
                  color={palette.success}
                />
                <ThemedText style={[styles.buttonText, { color: palette.textInverse }]}>
                  BLOCK
                </ThemedText>
              </Pressable>
            </Animated.View>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              disabled>
              <MaterialCommunityIcons
                name="gift-outline"
                size={iconSize}
                color={palette.accent}
                style={{ opacity: 0.4 }}
              />
              <ThemedText style={[styles.buttonText, { color: palette.textInverse, opacity: 0.4 }]}>
                OPP TURN
              </ThemedText>
            </Pressable>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

type Metrics = {
  iconSize: number;
  containerRadius: number;
  textSize: number;
  estimatedWidth: number;
  estimatedHeight: number;
};

function getMetrics(sizeClass: SizeClass): Metrics {
  return getSizeClassValue(
    {
      small: {
        iconSize: 20,
        containerRadius: 28,
        textSize: 11,
        estimatedWidth: 280,
        estimatedHeight: 56,
      },
      medium: {
        iconSize: 22,
        containerRadius: 30,
        textSize: 12,
        estimatedWidth: 320,
        estimatedHeight: 66,
      },
      large: {
        iconSize: 24,
        containerRadius: 34,
        textSize: 13,
        estimatedWidth: 360,
        estimatedHeight: 74,
      },
    },
    sizeClass,
  );
}

function createStyles(metrics: Metrics) {
  const { iconSize, containerRadius, textSize } = metrics;
  const d = (iconSize - 20) / 2;

  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6 + d * 2,
      paddingVertical: 8 + d,
      borderRadius: containerRadius,
      borderWidth: 1,
      gap: 2 + d,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1000,
    },
    dragHandle: {
      padding: 6 + d,
      borderRadius: 12 + d,
      opacity: 0.6,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8 + d,
      paddingHorizontal: 10 + d * 2,
      gap: 6 + d,
      borderRadius: 12 + d,
    },
    buttonText: {
      fontSize: textSize,
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10 + d,
      paddingHorizontal: 16 + d * 2,
      gap: 8 + d,
      borderRadius: 12 + d,
    },
    startText: {
      fontSize: textSize + 2,
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
    },
  });
}
