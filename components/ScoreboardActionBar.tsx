import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
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
  const { width: screenWidth, height: screenHeight } = useLayout();
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
  const [measuredSize, setMeasuredSize] = useState({
    width: BAR_WIDTH_INITIAL,
    height: BAR_HEIGHT_INITIAL,
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
    const bottomBound = screenHeight - insets.bottom - effectiveHeight - 8;

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
              size={20}
              color={palette.danger}
            />
          ),
        },
        {
          label: 'DROP',
          action: { type: 'drop' as const },
          renderIcon: () => <FontAwesome5 name="hands-wash" size={20} color={palette.danger} />,
        },
        {
          label: 'T/A',
          action: { type: 'throwaway' as const },
          renderIcon: () => (
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={palette.danger} />
          ),
        },
        {
          label: '50/50',
          action: { type: 'fiftyfifty' as const },
          renderIcon: () => (
            <MaterialCommunityIcons name="scale-balance" size={20} color={palette.danger} />
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
              size={20}
              color={palette.success}
            />
          ),
        },
        {
          label: 'OPP TURN',
          action: { type: 'turn' as const },
          renderIcon: () => (
            <MaterialCommunityIcons name="gift-outline" size={20} color={palette.accent} />
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
            size={pendingTimeoutModal ? 20 : 14}
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
                size={24}
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
            <MaterialCommunityIcons name="timer-outline" size={22} color={palette.accent} />
            {!isVertical && (
              <Text style={[styles.startPointText, { color: palette.accent }]}>START POINT</Text>
            )}
          </Pressable>
        ) : showResumePoint || (pendingTimeoutModal && isComplete) ? (
          /* Resume Point Button - shows when timer is paused or timeout complete */
          <Pressable
            style={({ pressed }) => [styles.startPointButton, pressed && styles.buttonPressed]}
            onPress={pendingTimeoutModal ? handleContinue : togglePointTimerPause}>
            <MaterialCommunityIcons name="play" size={22} color={palette.success} />
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
  startPointButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 12,
  },
  startPointText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 6,
  },
  timeoutPlayPause: {
    padding: 8,
    borderRadius: 20,
  },
  timeoutTime: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
});
