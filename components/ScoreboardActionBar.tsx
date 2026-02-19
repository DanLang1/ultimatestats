import { useTheme } from '@/context/ThemeContext';
import { SizeClass, useLayout } from '@/hooks/useLayout';
import { useReclampOnResize } from '@/hooks/useReclampOnResize';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    gameLocked,
    togglePointTimerPause,
    pendingTimeoutModal,
  } = useGameStore();

  const { formattedTime, isRunning, isComplete, toggleTimer, handleContinue } = useTimeoutTimer();

  const showResumePoint =
    pointTimerEnabled && statTrackingEnabled && pointTimerPausedElapsed !== null && !gameLocked;

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
      return screenHeight - metrics.estimatedHeight - 100;
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
    const effectiveWidth = boxWidth.value;
    const effectiveHeight = boxHeight.value;

    // Account for safe areas and margin for shadows
    const leftBound = insets.left + 8;
    const rightBound = screenWidth - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.bottom - effectiveHeight - 10;

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

  // Show bar if there's possession OR if there's an active timeout
  if (!possession && !pendingTimeoutModal) return null;

  const barBackgroundColor = palette.glassBg;

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

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          boxWidth.value = width;
          boxHeight.value = height;
          setMeasuredSize({ width, height });
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
        {/* Drag handle - opens modal during timeout, toggles orientation otherwise */}
        <Pressable
          style={styles.dragHandle}
          onPress={
            pendingTimeoutModal ? () => router.push('/TimeoutModal') : toggleActionBarOrientation
          }>
          <MaterialCommunityIcons
            name={
              pendingTimeoutModal
                ? 'arrow-expand'
                : isVertical
                  ? 'arrow-expand-horizontal'
                  : 'arrow-expand-vertical'
            }
            size={pendingTimeoutModal ? iconSize : dragIconSize}
            color={palette.textMuted}
          />
        </Pressable>

        {/* Timeout UI - shows when timeout is active and timer still running */}
        {pendingTimeoutModal && !isComplete ? (
          <View style={styles.timeoutContainer}>
            <Pressable
              style={({ pressed }) => [styles.timeoutPlayPause, pressed && styles.buttonPressed]}
              onPress={toggleTimer}>
              <MaterialCommunityIcons
                name={isRunning ? 'pause' : 'play'}
                size={timeoutControlIconSize}
                color={palette.accent}
              />
            </Pressable>
            <Text style={[styles.timeoutTime, { color: palette.textInverse }]}>
              {formattedTime}
            </Text>
          </View>
        ) : showStartPoint && onStartPoint ? (
          /* Start Point Button - shows when point needs to be started */
          <Pressable
            style={({ pressed }) => [styles.startPointButton, pressed && styles.buttonPressed]}
            onPress={onStartPoint}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={startIconSize}
              color={palette.accent}
            />
            {!isVertical && (
              <Text style={[styles.startPointText, { color: palette.accent }]}>START POINT</Text>
            )}
          </Pressable>
        ) : showResumePoint || (pendingTimeoutModal && isComplete) ? (
          /* Resume Point Button - shows when timer is paused or timeout complete */
          <Pressable
            style={({ pressed }) => [styles.startPointButton, pressed && styles.buttonPressed]}
            onPress={pendingTimeoutModal ? handleContinue : togglePointTimerPause}>
            <MaterialCommunityIcons name="play" size={startIconSize} color={palette.success} />
            {!isVertical && (
              <Text style={[styles.startPointText, { color: palette.success }]}>RESUME POINT</Text>
            )}
          </Pressable>
        ) : (
          /* Action buttons */
          buttons.map((btn) => (
            <Pressable
              key={btn.label}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => onAction(btn.action)}>
              {btn.renderIcon()}
              {!isVertical && (
                <Text style={[styles.buttonText, { color: palette.textInverse }]}>{btn.label}</Text>
              )}
            </Pressable>
          ))
        )}
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
  if (sizeClass === 'large')
    return {
      estimatedWidth: 360,
      estimatedHeight: 74,
      iconSize: 24,
      containerRadius: 34,
      textSize: 13,
    };
  if (sizeClass === 'medium')
    return {
      estimatedWidth: 320,
      estimatedHeight: 66,
      iconSize: 22,
      containerRadius: 30,
      textSize: 12,
    };
  return {
    estimatedWidth: BAR_WIDTH_INITIAL,
    estimatedHeight: BAR_HEIGHT_INITIAL,
    iconSize: 20,
    containerRadius: 28,
    textSize: 11,
  };
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
      shadowColor: '#000',
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
      fontWeight: '700',
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
      fontWeight: '800',
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
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      minWidth: 50 + d * 7,
      textAlign: 'center',
    },
  });
}
