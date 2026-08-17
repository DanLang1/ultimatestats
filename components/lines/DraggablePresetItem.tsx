import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  ReduceMotion,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { LinePreset } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

const ITEM_HEIGHT = 48;
const GAP = 8;
const ROW_HEIGHT = ITEM_HEIGHT + GAP;

interface DraggablePresetItemProps {
  preset: LinePreset;
  index: number;
  isDragging: boolean;
  totalCount: number;
  draggingId: SharedValue<string>;
  dragTranslateY: SharedValue<number>;
  dragOriginIndex: SharedValue<number>;
  dragCurrentIndex: SharedValue<number>;
  onDragStart: (presetId: string) => void;
  onSwap: (fromIndex: number, toIndex: number) => void;
  onDragEnd: () => void;
  onEditPreset: (preset: LinePreset) => void;
  onDeletePreset: (preset: LinePreset) => void;
}

export function DraggablePresetItem({
  preset,
  index,
  isDragging: isDraggingProp,
  totalCount,
  draggingId,
  dragTranslateY,
  dragOriginIndex,
  dragCurrentIndex,
  onDragStart,
  onSwap,
  onDragEnd,
  onEditPreset,
  onDeletePreset,
}: DraggablePresetItemProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const dragIconSize = scaleBySizeClass(22, sizeClass);
  const actionIconSize = scaleBySizeClass(16, sizeClass);

  // Smoothed layout compensation — animated with withTiming so the dragged item
  // transitions in sync with LinearTransition on non-dragged items, avoiding a
  // flash caused by the UI-thread offset jumping before the JS-thread store swap.
  const animatedOffset = useSharedValue(0);

  // oxlint-disable-next-line react/react-compiler -- Gesture.Pan is a factory; keep the literal call so Worklets can recognize the gesture chain.
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      draggingId.set(preset.id);
      dragTranslateY.set(0);
      dragOriginIndex.set(index);
      dragCurrentIndex.set(index);
      animatedOffset.set(0);
      scheduleOnRN(onDragStart, preset.id);
    })
    .onUpdate((e) => {
      'worklet';
      dragTranslateY.set(e.translationY);

      const desiredIndex = dragOriginIndex.get() + Math.round(e.translationY / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(totalCount - 1, desiredIndex));

      if (clamped !== dragCurrentIndex.get()) {
        const from = dragCurrentIndex.get();
        const to = from + (clamped > from ? 1 : -1);
        dragCurrentIndex.set(to);
        animatedOffset.set(
          withTiming((to - dragOriginIndex.get()) * ROW_HEIGHT, {
            duration: 100,
            reduceMotion: ReduceMotion.Never,
          }),
        );
        scheduleOnRN(onSwap, from, to);
      }
    })
    .onEnd(() => {
      'worklet';
      draggingId.set('');
      dragTranslateY.set(0);
      dragOriginIndex.set(-1);
      dragCurrentIndex.set(-1);
      animatedOffset.set(0);
      scheduleOnRN(onDragEnd);
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (draggingId.get() === preset.id) {
      return {
        transform: [{ translateY: dragTranslateY.get() - animatedOffset.get() }, { scale: 1.02 }],
        zIndex: 100,
        opacity: 0.9,
      };
    }
    return {
      transform: [{ translateY: 0 }],
      zIndex: 1,
      opacity: 1,
    };
  });

  return (
    <Animated.View
      layout={
        isDraggingProp ? undefined : LinearTransition.duration(150).reduceMotion(ReduceMotion.Never)
      }
      style={[styles.item, { backgroundColor: palette.overlay08 }, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag" size={dragIconSize} color={palette.textMuted} />
        </View>
      </GestureDetector>
      <View style={[styles.orderBadge, { backgroundColor: palette.overlay12 }]}>
        <ThemedText style={[styles.orderText, { color: palette.textInverse }]}>
          {index + 1}
        </ThemedText>
      </View>
      <View style={styles.infoSection}>
        <ThemedText style={[styles.presetName, { color: palette.textInverse }]}>
          {preset.name}
        </ThemedText>
        <ThemedText style={[styles.presetCount, { color: palette.textMuted }]}>
          {preset.playerIds.length} players
        </ThemedText>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onEditPreset(preset)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: palette.overlay05 },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={4}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={actionIconSize}
            color={palette.textMuted}
          />
        </Pressable>
        <Pressable
          onPress={() => onDeletePreset(preset)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: palette.dangerOverlay15 },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={4}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={actionIconSize}
            color={palette.danger}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    item: {
      height: ITEM_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingRight: 16,
    },
    dragHandle: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    orderText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
    },
    infoSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    presetName: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    presetCount: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      padding: 6,
      borderRadius: 8,
    },
  });
}
