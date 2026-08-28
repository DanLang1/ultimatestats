import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimeoutTimer } from '@/hooks/basic/useTimeoutTimer';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import { useReclampOnResize } from '@/hooks/useReclampOnResize';
import { useGameStore } from '@/store/basic/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Fonts } from '@/theme/theme';

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
  showStartPoint?: boolean;
  onStartPoint?: () => void;
}

const BAR_WIDTH_INITIAL = 280;
const BAR_HEIGHT_INITIAL = 56;

export function ScoreboardActionBar({
  possession,
  onAction,
  showStartPoint,
  onStartPoint,
}: ScoreboardActionBarProps) {
  const { palette } = useTheme();
  const { width: screenWidth, height: screenHeight, sizeClass } = useLayout();
  const metrics = getActionBarMetrics(sizeClass);
  const styles = createStyles(metrics);
  // Icon sizes derived from metrics.iconSize — used inline in JSX
  const { iconSize } = metrics;
  const dragIconSize = iconSize - 6;
  const startIconSize = iconSize + 2;
  const timeoutControlIconSize = iconSize + 4;
  const insets = useSafeAreaInsets();
  const {
    actionBarPosition,
    actionBarOrientation,
    setActionBarPosition,
    toggleActionBarOrientation,
  } = useUIStore();

  const {
    pointTimerEnabled,
    statTrackingEnabled,
    pointTimerPausedElapsed,
    currentGameStatus,
    togglePointTimerPause,
    pendingTimeoutModal,
  } = useGameStore();

  const { formattedTime, isRunning, isOvertime, toggleTimer, handleContinue } = useTimeoutTimer();

  const showResumePoint =
    pointTimerEnabled &&
    statTrackingEnabled &&
    pointTimerPausedElapsed !== null &&
    currentGameStatus !== 'finished';

  const isVertical = actionBarOrientation === 'vertical';
  const isMyTeam = possession === 'team1';

  // Derive initial position: use stored position or calculate default center-bottom
  const getInitialX = () => {
    if (actionBarPosition.x === 0 && actionBarPosition.y === 0) {
      return (screenWidth - metrics.estimatedWidth) / 2;
    }
    return actionBarPosition.x;
  };

  const getInitialY = () => {
    if (actionBarPosition.x === 0 && actionBarPosition.y === 0) {
      return screenHeight - insets.top - insets.bottom - metrics.estimatedHeight - 100;
    }
    return actionBarPosition.y;
  };

  // Shared values for smooth dragging
  const translateX = useSharedValue(getInitialX());
  const translateY = useSharedValue(getInitialY());
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const boxWidth = useSharedValue(metrics.estimatedWidth);
  const boxHeight = useSharedValue(metrics.estimatedHeight);
  const [measuredSize, setMeasuredSize] = useState({
    width: metrics.estimatedWidth,
    height: metrics.estimatedHeight,
  });

  // Clamp position within screen bounds
  const clampPosition = (x: number, y: number) => {
    'worklet';
    const effectiveWidth = boxWidth.get();
    const effectiveHeight = boxHeight.get();

    // Account for safe areas and margin for shadows
    const leftBound = 8;
    const rightBound = screenWidth - insets.left - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.top - insets.bottom - effectiveHeight - 10;

    const clampedX = Math.max(leftBound, Math.min(x, rightBound));
    const clampedY = Math.max(topBound, Math.min(y, bottomBound));
    return { x: clampedX, y: clampedY };
  };

  // Re-clamp position when screen dimensions change (e.g. rotation)
  useReclampOnResize({
    translateX,
    translateY,
    effectiveWidth: measuredSize.width,
    effectiveHeight: measuredSize.height,
  });

  // oxlint-disable-next-line react/capitalized-calls -- Gesture.Pan is a factory; keep the literal call so Worklets can recognize the gesture chain.
  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      'worklet';
      startX.set(translateX.get());
      startY.set(translateY.get());
      isDragging.set(true);
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
      isDragging.set(false);

      // Perform final hard clamp
      const finalClamped = clampPosition(translateX.get(), translateY.get());

      translateX.set(withSpring(finalClamped.x));
      translateY.set(withSpring(finalClamped.y));

      scheduleOnRN(setActionBarPosition, { x: finalClamped.x, y: finalClamped.y });
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale: withSpring(isDragging.get() ? 1.05 : 1, { damping: 30 }) },
      ],
      opacity: withSpring(isDragging.get() ? 0.8 : 1),
    };
  });

  // Show bar if there's possession OR if there's an active timeout
  if (!possession && !pendingTimeoutModal) return null;

  const barBackgroundColor = palette.glassBg;

  let dragHandleIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  if (pendingTimeoutModal) {
    dragHandleIcon = 'arrow-expand';
  } else {
    dragHandleIcon = isVertical ? 'arrow-expand-horizontal' : 'arrow-expand-vertical';
  }

  type ButtonConfig = {
    label: string;
    action: ActionBarAction;
    renderIcon: () => React.ReactNode;
  };

  const buttons: ButtonConfig[] = isMyTeam
    ? [
        {
          label: 'OPP D',
          action: { type: 'oppBlock' as const },
          renderIcon: () => (
            <MaterialCommunityIcons
              name="hand-front-left-outline"
              size={iconSize}
              color={palette.danger}
            />
          ),
        },
        {
          label: 'DROP',
          action: { type: 'drop' as const },
          renderIcon: () => (
            <FontAwesome5 name="hands-wash" size={iconSize} color={palette.danger} />
          ),
        },
        {
          label: 'T/A',
          action: { type: 'throwaway' as const },
          renderIcon: () => (
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={iconSize}
              color={palette.danger}
            />
          ),
        },
        {
          label: '50/50',
          action: { type: 'fiftyfifty' as const },
          renderIcon: () => (
            <MaterialCommunityIcons name="scale-balance" size={iconSize} color={palette.danger} />
          ),
        },
      ]
    : [
        {
          label: 'BLOCK',
          action: { type: 'block' as const },
          renderIcon: () => (
            <MaterialCommunityIcons
              name="hand-back-left-outline"
              size={iconSize}
              color={palette.success}
            />
          ),
        },
        {
          label: 'OPP TURN',
          action: { type: 'turn' as const },
          renderIcon: () => (
            <MaterialCommunityIcons name="gift-outline" size={iconSize} color={palette.accent} />
          ),
        },
      ];

  let barContent: React.ReactNode;
  if (pendingTimeoutModal && isRunning) {
    barContent = (
      <View style={styles.timeoutContainer}>
        <Pressable
          style={({ pressed }) => [styles.timeoutPlayPause, pressed && styles.buttonPressed]}
          onPress={toggleTimer}>
          <MaterialCommunityIcons
            name="pause"
            size={timeoutControlIconSize}
            color={palette.accent}
          />
        </Pressable>
        <ThemedText
          style={[
            styles.timeoutTime,
            { color: isOvertime ? palette.danger : palette.textInverse },
          ]}>
          {formattedTime}
        </ThemedText>
      </View>
    );
  } else if (showStartPoint && onStartPoint) {
    barContent = (
      <Pressable
        style={({ pressed }) => [styles.startPointButton, pressed && styles.buttonPressed]}
        onPress={onStartPoint}>
        <MaterialCommunityIcons name="timer-outline" size={startIconSize} color={palette.accent} />
        {!isVertical && (
          <ThemedText style={[styles.startPointText, { color: palette.accent }]}>
            START POINT
          </ThemedText>
        )}
      </Pressable>
    );
  } else if (showResumePoint || (pendingTimeoutModal && !isRunning)) {
    barContent = (
      <Pressable
        style={({ pressed }) => [styles.startPointButton, pressed && styles.buttonPressed]}
        onPress={pendingTimeoutModal ? handleContinue : togglePointTimerPause}>
        <MaterialCommunityIcons name="play" size={startIconSize} color={palette.success} />
        {!isVertical && (
          <ThemedText style={[styles.startPointText, { color: palette.success }]}>
            {pendingTimeoutModal ? 'END TIMEOUT' : 'RESUME POINT'}
          </ThemedText>
        )}
      </Pressable>
    );
  } else {
    barContent = buttons.map((btn) => (
      <Pressable
        key={btn.label}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => onAction(btn.action)}>
        {btn.renderIcon()}
        {!isVertical && (
          <ThemedText style={[styles.buttonText, { color: palette.textInverse }]}>
            {btn.label}
          </ThemedText>
        )}
      </Pressable>
    ));
  }

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
            backgroundColor: barBackgroundColor,
            borderColor: palette.overlay10,
            flexDirection: isVertical ? 'column' : 'row',
            shadowColor: palette.shadow,
          },
        ]}>
        {/* Drag handle - opens modal during timeout, toggles orientation otherwise */}
        <Pressable
          style={styles.dragHandle}
          onPress={
            pendingTimeoutModal ? () => router.push('/TimeoutModal') : toggleActionBarOrientation
          }>
          <MaterialCommunityIcons
            name={dragHandleIcon}
            size={pendingTimeoutModal ? iconSize : dragIconSize}
            color={palette.textMuted}
          />
        </Pressable>

        {barContent}
      </Animated.View>
    </GestureDetector>
  );
}

// ── Metrics ───────────────────────────────────────────────────────────
// Only the fields that don't scale linearly from iconSize are kept
// explicit. Everything else is derived in createStyles via:
//   d = (iconSize - 20) / 2   →   0 (small) | 1 (medium) | 2 (large)

type ActionBarMetrics = {
  estimatedWidth: number; // needed for initial position / clamping math
  estimatedHeight: number; // needed for initial position / clamping math
  iconSize: number; // base action icon size; drives all icon + spacing derivations
  containerRadius: number; // non-linear (28 → 30 → 34), keep explicit
  textSize: number; // button label text size
};

function getActionBarMetrics(sizeClass: SizeClass): ActionBarMetrics {
  return getSizeClassValue(
    {
      small: {
        estimatedWidth: BAR_WIDTH_INITIAL,
        estimatedHeight: BAR_HEIGHT_INITIAL,
        iconSize: 20,
        containerRadius: 28,
        textSize: 11,
      },
      medium: {
        estimatedWidth: 320,
        estimatedHeight: 66,
        iconSize: 22,
        containerRadius: 30,
        textSize: 12,
      },
      large: {
        estimatedWidth: 360,
        estimatedHeight: 74,
        iconSize: 24,
        containerRadius: 34,
        textSize: 13,
      },
    },
    sizeClass,
  );
}

function createStyles(metrics: ActionBarMetrics) {
  const { iconSize, containerRadius, textSize } = metrics;
  const d = (iconSize - 20) / 2; // 0 | 1 | 2

  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
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
    startPointButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10 + d,
      paddingHorizontal: 16 + d * 2,
      gap: 8 + d,
      borderRadius: 12 + d,
    },
    startPointText: {
      fontSize: textSize + 2,
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
    },
    timeoutContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2 + d * 2,
      paddingRight: 6 + d,
    },
    timeoutPlayPause: {
      padding: 8 + d,
      borderRadius: 20 + d,
    },
    timeoutTime: {
      fontSize: iconSize + 2,
      fontFamily: Fonts.extraBold,
      fontVariant: ['tabular-nums'],
      minWidth: 50 + d * 7,
      textAlign: 'center',
    },
  });
}
